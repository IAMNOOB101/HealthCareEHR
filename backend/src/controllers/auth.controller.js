import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, Role } from "../models/index.js";
import { sendPasswordResetOtp } from "../utils/email.js";

const JWT_SECRET     = process.env.JWT_SECRET || "ehr_secret_key";
const JWT_EXPIRES_IN = "8h";

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/register
const register = async (req, res) => {
    const { username, password, roleId } = req.body;

    const missing = [];
    if (!username) missing.push("username");
    if (!password) missing.push("password");
    if (!roleId)   missing.push("roleId");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (password.length < 8)
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    try {
        const roleExists = await Role.findByPk(roleId);
        if (!roleExists)
            return res.status(400).json({ success: false, message: "Invalid roleId — role does not exist" });

        const existingUser = await User.findOne({ where: { username: username.toLowerCase() } });
        if (existingUser)
            return res.status(409).json({ success: false, message: "Username already exists" });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ username: username.toLowerCase(), passwordHash, roleId });

        return res.status(201).json({
            success: true,
            data: {
                id:        user.id,
                username:  user.username,
                roleId:    user.roleId,
                roleName:  roleExists.roleName,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ success: false, message: "Username and password are required" });

    try {
        const user = await User.unscoped().findOne({
            where: { username: username.toLowerCase() },
            include: [{ model: Role, attributes: ["roleName"] }]
        });

        if (!user)
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        if (!user.isActive)
            return res.status(403).json({ success: false, message: "Account is deactivated" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        const token = jwt.sign(
            {
                userId:   user.id,
                username: user.username,
                roleId:   user.roleId,
                roleName: user.Role?.roleName
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id:       user.id,
                    username: user.username,
                    roleId:   user.roleId,
                    roleName: user.Role?.roleName
                }
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/auth/me
const getMe = (req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

// PATCH /api/auth/deactivate/:id
const deactivateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        await user.update({ isActive: false });
        return res.status(200).json({ success: true, message: "User deactivated successfully" });
    } catch (err) {
        console.error("Deactivate error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ── Forgot Password ───────────────────────────────────────────────────────────

// POST /api/auth/forgot-password
// Body: { username, email }  — username is looked up, OTP sent to email
const forgotPassword = async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email)
        return res.status(400).json({ success: false, message: "Username and email are required" });

    try {
        const user = await User.unscoped().findOne({ where: { username: username.toLowerCase() } });

        // Always return success to prevent username enumeration
        if (!user || !user.isActive) {
            return res.status(200).json({
                success: true,
                message: "If a matching account is found, an OTP has been sent to your email."
            });
        }

        const otp = generateOtp();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store plain OTP — it's short-lived and low-value
        await user.update({ resetToken: otp, resetTokenExpiry: expiry });

        // Send email (fires async — don't await to avoid slow response)
        sendPasswordResetOtp(email, otp, 'staff').catch((err) =>
            console.error("OTP email failed:", err.message)
        );

        console.log(`[DEV] Staff OTP for ${username}: ${otp}`); // dev convenience

        return res.status(200).json({
            success: true,
            message: "If a matching account is found, an OTP has been sent to your email."
        });
    } catch (err) {
        console.error("forgotPassword error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/auth/verify-otp
// Body: { username, otp }
const verifyOtp = async (req, res) => {
    const { username, otp } = req.body;
    if (!username || !otp)
        return res.status(400).json({ success: false, message: "Username and OTP are required" });

    try {
        const user = await User.unscoped().findOne({ where: { username: username.toLowerCase() } });

        if (!user || user.resetToken !== String(otp) || !user.resetTokenExpiry)
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

        if (new Date() > new Date(user.resetTokenExpiry))
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });

        // Issue a short-lived reset session token
        const resetSessionToken = jwt.sign(
            { userId: user.id, purpose: "password-reset" },
            JWT_SECRET,
            { expiresIn: "10m" }
        );

        // Clear OTP from DB (single-use)
        await user.update({ resetToken: null, resetTokenExpiry: null });

        return res.status(200).json({ success: true, data: { resetSessionToken } });
    } catch (err) {
        console.error("verifyOtp error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/auth/reset-password
// Body: { resetSessionToken, newPassword }
const resetPassword = async (req, res) => {
    const { resetSessionToken, newPassword } = req.body;
    if (!resetSessionToken || !newPassword)
        return res.status(400).json({ success: false, message: "Reset token and new password are required" });

    if (newPassword.length < 8)
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    try {
        let decoded;
        try {
            decoded = jwt.verify(resetSessionToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: "Reset session expired. Please start over." });
        }

        if (decoded.purpose !== "password-reset")
            return res.status(401).json({ success: false, message: "Invalid reset token." });

        const user = await User.unscoped().findByPk(decoded.userId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await user.update({ passwordHash });

        return res.status(200).json({ success: true, message: "Password reset successfully. Please log in." });
    } catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { register, login, getMe, deactivateUser, forgotPassword, verifyOtp, resetPassword };