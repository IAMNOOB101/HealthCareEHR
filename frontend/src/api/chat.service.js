import axiosClient from "./axiosClient";
import axios from "axios";

/**
 * portalChatClient — for patient-portal routes (/portal/...)
 * Uses the portal_token from localStorage.
 * Vite dev server proxies /portal → http://localhost:5000
 */
const portalChatClient = axios.create({
    baseURL: "",   // Vite proxy handles /portal/* in dev; in prod set VITE_BASE_URL
    headers: { "Content-Type": "application/json" },
});

portalChatClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("portal_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

portalChatClient.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
);

// ── Portal (Patient) chat endpoints ──────────────────────────────────────────
export const portalChatService = {
    getDoctors: ()          => portalChatClient.get("/portal/chat/doctors"),
    getHistory: (doctorId)  => portalChatClient.get(`/portal/chat/history/${doctorId}`),
    markRead:   (doctorId)  => portalChatClient.patch(`/portal/chat/read/${doctorId}`),
};

// ── Staff (Doctor) chat endpoints ─────────────────────────────────────────────
// axiosClient already has baseURL = /api and attaches ehr_token automatically
export const staffChatService = {
    getPatients:    ()              => axiosClient.get("/chat/patients"),
    getAllPatients:  ()              => axiosClient.get("/chat/all-patients"),
    getHistory:     (portalUserId)  => axiosClient.get(`/chat/history/${portalUserId}`),
    markRead:       (portalUserId)  => axiosClient.patch(`/chat/read/${portalUserId}`),
};
