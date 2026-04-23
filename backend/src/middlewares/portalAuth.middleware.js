import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ehr_secret_key";

/**
 * Validates Portal (Patient) JWTs ONLY. 
 * Prevents Staff tokens from accessing Patient endpoints.
 */
const protectPortal = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ success: false, message: "No token provided" });

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Crucial security split: only tokens with portalUserId are accepted.
        // If an Admin/Doctor tries to hit a patient endpoint with their staff token, reject them.
        if (!decoded.portalUserId || !decoded.patientId || decoded.role !== "Patient")
            return res.status(403).json({ success: false, message: "Staff tokens not accepted on portal routes. Please login as a patient." });

        req.portalUser = decoded; // Contains { portalUserId, patientId, email, role: "Patient" }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

export { protectPortal };
