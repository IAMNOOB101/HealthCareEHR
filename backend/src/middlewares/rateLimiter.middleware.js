import rateLimit from "express-rate-limit";

// Strict limiter for authentication endpoints (login, register, forgot-password)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 15, // max 15 attempts per IP per 15 mins to prevent brute forcing
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again in 15 minutes."
    }
});

// General API limiter for all portal endpoints 
export const portalLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 100, // 100 requests per minute per IP
    message: {
        success: false,
        message: "Too many requests. Please slow down."
    }
});
