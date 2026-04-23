import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PortalUser, Patient, NotificationPreference } from "../../models/index.js";
import { sendPasswordResetOtp } from "../../utils/email.js";

const JWT_SECRET = process.env.JWT_SECRET || "ehr_secret_key";

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /portal/auth/register
export const patientRegister = async (req, res) => {
    try {
        const { patientId, email, password } = req.body;

        if (!patientId || !email || !password)
            return res.status(400).json({ success: false, message: "patientId, email and password are required." });

        // 1. Validate patient exists
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient record not found. Please check your Patient ID." });

        // 2. Check already registered
        const existingByPatient = await PortalUser.findOne({ where: { patientId } });
        if (existingByPatient)
            return res.status(400).json({ success: false, message: "A portal account already exists for this patient." });

        // 3. Check email taken
        const existingByEmail = await PortalUser.findOne({ where: { email } });
        if (existingByEmail)
            return res.status(400).json({ success: false, message: "Email is already registered." });

        // 4. Validate password length
        if (password.length < 8)
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });

        // 5. Hash & create — auto-verified (no email verification step)
        const passwordHash = await bcrypt.hash(password, 10);

        const portalUser = await PortalUser.create({
            patientId,
            email,
            passwordHash,
            verificationToken: null,
            isVerified: true,  // auto-verified per design decision
        });

        // 6. Auto-seed notification preferences
        await NotificationPreference.create({ portalUserId: portalUser.id });

        return res.status(201).json({
            success: true,
            message: "Portal account created successfully. You can now log in.",
            data: { id: portalUser.id, email: portalUser.email }
        });
    } catch (err) {
        console.error("patientRegister error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /portal/auth/login
export const patientLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ success: false, message: "Email and password are required." });

        const portalUser = await PortalUser.unscoped().findOne({
            where: { email },
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }]
        });

        if (!portalUser)
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        if (!portalUser.isActive)
            return res.status(403).json({ success: false, message: "Account is deactivated. Please contact the clinic." });

        const isMatch = await bcrypt.compare(password, portalUser.passwordHash);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        await portalUser.update({ lastLoginAt: new Date() });

        const token = jwt.sign(
            {
                portalUserId: portalUser.id,
                patientId:    portalUser.patientId,
                email:        portalUser.email,
                role:         "Patient"
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            success: true,
            data: {
                token,
                portalUserId: portalUser.id,
                patientId:    portalUser.patientId,
                patientName:  `${portalUser.Patient.firstName} ${portalUser.Patient.lastName}`,
                email:        portalUser.email,
            }
        });
    } catch (err) {
        console.error("patientLogin error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/auth/verify/:token  (kept for backwards compat, auto-verifies any token to be safe)
export const verifyEmail = async (req, res) => {
    try {
        const portalUser = await PortalUser.findOne({ where: { verificationToken: req.params.token } });
        if (!portalUser)
            return res.status(400).json({ success: false, message: "Invalid or expired verification link." });

        await portalUser.update({ isVerified: true, verificationToken: null });
        return res.status(200).json({ success: true, message: "Email verified successfully." });
    } catch (err) {
        console.error("verifyEmail error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/auth/me
export const getPortalMe = async (req, res) => {
    try {
        const portalUser = await PortalUser.findByPk(req.portalUser.portalUserId, {
            attributes: ["id", "email", "isActive", "isVerified", "lastLoginAt"],
            include: [{ model: Patient }]
        });

        if (!portalUser)
            return res.status(404).json({ success: false, message: "User not found" });

        return res.status(200).json({ success: true, data: portalUser });
    } catch (err) {
        console.error("getPortalMe error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ── Patient Forgot Password ───────────────────────────────────────────────────

// POST /portal/auth/forgot-password
// Body: { email }
export const forgotPortalPassword = async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ success: false, message: "Email is required." });

    try {
        const portalUser = await PortalUser.unscoped().findOne({ where: { email } });

        // Always return success to prevent email enumeration
        if (!portalUser || !portalUser.isActive) {
            return res.status(200).json({
                success: true,
                message: "If a matching account is found, an OTP has been sent to your email."
            });
        }

        const otp = generateOtp();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await portalUser.update({ resetToken: otp, resetTokenExpiry: expiry });

        sendPasswordResetOtp(email, otp, 'patient').catch((err) =>
            console.error("Portal OTP email failed:", err.message)
        );

        console.log(`[DEV] Portal OTP for ${email}: ${otp}`); // dev convenience

        return res.status(200).json({
            success: true,
            message: "If a matching account is found, an OTP has been sent to your email."
        });
    } catch (err) {
        console.error("forgotPortalPassword error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /portal/auth/verify-otp
// Body: { email, otp }
export const verifyPortalOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp)
        return res.status(400).json({ success: false, message: "Email and OTP are required." });

    try {
        const portalUser = await PortalUser.unscoped().findOne({ where: { email } });

        if (!portalUser || portalUser.resetToken !== String(otp) || !portalUser.resetTokenExpiry)
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

        if (new Date() > new Date(portalUser.resetTokenExpiry))
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });

        const resetSessionToken = jwt.sign(
            { portalUserId: portalUser.id, purpose: "portal-password-reset" },
            JWT_SECRET,
            { expiresIn: "10m" }
        );

        await portalUser.update({ resetToken: null, resetTokenExpiry: null });

        return res.status(200).json({ success: true, data: { resetSessionToken } });
    } catch (err) {
        console.error("verifyPortalOtp error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /portal/auth/reset-password
// Body: { resetSessionToken, newPassword }
export const resetPortalPassword = async (req, res) => {
    const { resetSessionToken, newPassword } = req.body;
    if (!resetSessionToken || !newPassword)
        return res.status(400).json({ success: false, message: "Reset token and new password are required." });

    if (newPassword.length < 8)
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

    try {
        let decoded;
        try {
            decoded = jwt.verify(resetSessionToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: "Reset session expired. Please start over." });
        }

        if (decoded.purpose !== "portal-password-reset")
            return res.status(401).json({ success: false, message: "Invalid reset token." });

        const portalUser = await PortalUser.unscoped().findByPk(decoded.portalUserId);
        if (!portalUser)
            return res.status(404).json({ success: false, message: "User not found." });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await portalUser.update({ passwordHash });

        return res.status(200).json({ success: true, message: "Password reset successfully. Please log in." });
    } catch (err) {
        console.error("resetPortalPassword error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
