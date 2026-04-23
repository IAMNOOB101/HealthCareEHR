import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ehr_secret_key";

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ success: false, message: "No token provided - authorization denied" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Security logic: prevent Patients from using their token on Staff routes
        if (decoded.role === "Patient" || decoded.portalUserId)
            return res.status(403).json({ success: false, message: "Portal tokens not accepted on staff routes" });

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json ({ success: false, message: "Invalid or expired token" });
    }
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user)
            return res.status(401).json({ success: false, message: "Not authenticated" });

        if(!allowedRoles.includes(req.user.roleName ))
            return res.status(403).json({ success: false, message: "Access denied" });

        next();
    };
};

export { protect, authorize };
