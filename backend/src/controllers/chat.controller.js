/**
 * chat.controller.js
 *
 * REST endpoints that complement the real-time WebSocket layer:
 *  - GET  /api/chat/doctors          → list of doctors a patient can contact (staff route not needed)
 *  - GET  /portal/chat/doctors       → list of doctors (portal / patient side)
 *  - GET  /portal/chat/history/:doctorId → fetch paginated conversation history
 *  - GET  /api/chat/patients         → list of patients the doctor has conversations with
 *  - GET  /api/chat/history/:portalUserId → doctor fetches conversation history with a patient
 *
 * All message bodies are stored as AES-GCM ciphertext.  The server NEVER
 * decrypts them — it only stores and forwards the encrypted blobs.
 */

import { ChatMessage, Doctor, Patient, PortalUser, User } from "../models/index.js";
import { getPagination } from "../utils/pagination.js";

// ── Helper: build a unique conversation "room" ID ───────────────────────────
// Format: chat_<patientId>_<doctorId>  (lowest ID first for canonical form)
export const buildRoomId = (patientId, doctorId) =>
    `chat_${patientId}_${doctorId}`;

// ────────────────────────────────────────────────────────────────────────────
//  PATIENT-FACING (Portal)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /portal/chat/doctors
 * Returns the list of active doctors the patient can initiate a chat with.
 * Includes specialty & department so the patient can pick the right doctor.
 */
export const getAvailableDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.findAll({
            where: { isActive: true },
            attributes: ["id", "firstName", "lastName", "specialization", "department", "email"],
            order: [["specialization", "ASC"], ["lastName", "ASC"]],
        });

        return res.json({ success: true, data: doctors });
    } catch (err) {
        console.error("getAvailableDoctors error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /portal/chat/history/:doctorId
 * Fetches the E2E encrypted conversation history between the logged-in patient
 * and the specified doctor (ordered oldest-first so the UI can render naturally).
 */
export const getPatientChatHistory = async (req, res) => {
    try {
        const { patientId, portalUserId } = req.portalUser;
        const { doctorId } = req.params;
        const { limit, offset } = getPagination(req.query, 50);

        const { count, rows } = await ChatMessage.findAndCountAll({
            where: { patientId, portalUserId, doctorId },
            attributes: ["id", "senderType", "ciphertext", "iv", "isRead", "createdAt"],
            order: [["createdAt", "ASC"]],
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: rows,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(req.query.page, 10) || 1,
            },
        });
    } catch (err) {
        console.error("getPatientChatHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * PATCH /portal/chat/read/:doctorId
 * Marks all unread messages FROM doctor TO patient as read.
 */
export const markPatientChatRead = async (req, res) => {
    try {
        const { patientId, portalUserId } = req.portalUser;
        const { doctorId } = req.params;

        await ChatMessage.update(
            { isRead: true, readAt: new Date() },
            {
                where: {
                    patientId,
                    portalUserId,
                    doctorId,
                    senderType: "doctor",
                    isRead: false,
                },
            }
        );

        return res.json({ success: true, message: "Marked as read" });
    } catch (err) {
        console.error("markPatientChatRead error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ────────────────────────────────────────────────────────────────────────────
//  DOCTOR / STAFF-FACING (API)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/chat/patients
 * Returns the list of patients who have active chat conversations with this
 * doctor (based on the linked Doctor record for the authenticated staff user).
 */
export const getChatPatients = async (req, res) => {
    try {
        // Resolve the Doctor record linked to the authenticated staff user.
        // Convention: doctor's email stored in Doctor table == User.username
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "No doctor profile linked to this account.",
            });
        }

        // Distinct (patientId, portalUserId) pairs that have chatted with this doctor
        const pairs = await ChatMessage.findAll({
            where: { doctorId: doctor.id },
            attributes: ["patientId", "portalUserId"],
            group: ["ChatMessage.patientId", "ChatMessage.portalUserId"],
            raw: true,
        });

        // Hydrate each pair with Patient + PortalUser details
        const rows = await Promise.all(
            pairs.map(async ({ patientId, portalUserId }) => {
                const [patient, portalUser] = await Promise.all([
                    Patient.findByPk(patientId, {
                        attributes: ["id", "firstName", "lastName", "dateOfBirth", "gender"],
                    }),
                    PortalUser.findByPk(portalUserId, {
                        attributes: ["id", "email"],
                    }),
                ]);
                return { patientId, portalUserId, Patient: patient, PortalUser: portalUser };
            })
        );

        return res.json({ success: true, data: rows, doctorId: doctor.id });

    } catch (err) {
        console.error("getChatPatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/chat/all-patients
 * Returns ALL patients with portal accounts so doctor can initiate a conversation.
 */
export const getAllPortalPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "No doctor profile linked to this account." });
        }

        const patients = await PortalUser.findAll({
            where: { isActive: true },
            attributes: ["id", "patientId", "email"],
            include: [{
                model: Patient,
                attributes: ["id", "firstName", "lastName", "dateOfBirth", "gender"],
            }],
            order: [[Patient, "lastName", "ASC"]],
        });

        return res.json({ success: true, data: patients, doctorId: doctor.id });
    } catch (err) {
        console.error("getAllPortalPatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/chat/history/:portalUserId
 * Doctor fetches the E2E encrypted conversation history with a patient.
 */
export const getDoctorChatHistory = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "No doctor profile linked." });
        }

        const { portalUserId } = req.params;
        const { limit, offset } = getPagination(req.query, 50);

        const portalUser = await PortalUser.findByPk(portalUserId, { attributes: ["patientId"] });
        if (!portalUser) {
            return res.status(404).json({ success: false, message: "Patient portal account not found." });
        }

        const { count, rows } = await ChatMessage.findAndCountAll({
            where: { doctorId: doctor.id, portalUserId, patientId: portalUser.patientId },
            attributes: ["id", "senderType", "ciphertext", "iv", "isRead", "createdAt"],
            order: [["createdAt", "ASC"]],
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: rows,
            doctorId: doctor.id,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(req.query.page, 10) || 1,
            },
        });
    } catch (err) {
        console.error("getDoctorChatHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * PATCH /api/chat/read/:portalUserId
 * Marks all unread messages FROM patient TO doctor as read.
 */
export const markDoctorChatRead = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });
        if (!doctor) return res.status(404).json({ success: false, message: "No doctor profile linked." });

        const { portalUserId } = req.params;

        await ChatMessage.update(
            { isRead: true, readAt: new Date() },
            {
                where: {
                    doctorId: doctor.id,
                    portalUserId,
                    senderType: "patient",
                    isRead: false,
                },
            }
        );

        return res.json({ success: true, message: "Marked as read" });
    } catch (err) {
        console.error("markDoctorChatRead error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
