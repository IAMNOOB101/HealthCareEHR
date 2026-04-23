import axiosClient from "../api/axiosClient";

// ── Staff auth (no token needed) ─────────────────────────────────────────────
const portalClient = axiosClient; // reuse same base URL; portal routes already proxied

export const portalAuthService = {
    register: (data) => portalClient.post("/portal/auth/register", data),
    login:    (data) => portalClient.post("/portal/auth/login", data),
    me:       ()     => portalClient.get("/portal/auth/me"),
    // Password reset
    forgotPassword: (data) => portalClient.post("/portal/auth/forgot-password", data),
    verifyOtp:      (data) => portalClient.post("/portal/auth/verify-otp", data),
    resetPassword:  (data) => portalClient.post("/portal/auth/reset-password", data),
};
