import axiosClient from "../api/axiosClient";

export const login = async (credentials) => {
    const res = await axiosClient.post("/auth/login", credentials);
    return res;
};

export const register = async (data) => {
    const res = await axiosClient.post("/auth/register", data);
    return res;
};

// ── Password Reset ─────────────────────────────────────────────────────────
export const forgotPassword = async (data) => {
    const res = await axiosClient.post("/auth/forgot-password", data);
    return res;
};

export const verifyOtp = async (data) => {
    const res = await axiosClient.post("/auth/verify-otp", data);
    return res;
};

export const resetPassword = async (data) => {
    const res = await axiosClient.post("/auth/reset-password", data);
    return res;
};