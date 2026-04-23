/**
 * socket.service.js
 *
 * Initialises the Socket.IO server and handles the real-time chat protocol.
 *
 * ── Security Design ─────────────────────────────────────────────────────────
 *  • Every socket connection MUST present a valid JWT in the handshake auth.
 *  • Patients use their portal_token; Doctors use their staff ehr_token.
 *  • Each conversation is an isolated room: "chat_<patientId>_<doctorId>".
 *  • Only the two participants are admitted to the room.
 *  • The server stores AES-GCM ciphertext + IV but NEVER decrypts them.
 *  • Admin tokens are rejected at socket connect time.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { Server }  from "socket.io";
import jwt         from "jsonwebtoken";

// Static imports — no dynamic import() inside event handlers
import { ChatMessage, Doctor, User, PortalUser } from "../models/index.js";
import { buildRoomId } from "../controllers/chat.controller.js";

const JWT_SECRET = process.env.JWT_SECRET || "ehr_secret_key";

export const initSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    // ── Authentication middleware ──────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("AUTH_MISSING"));

            const decoded = jwt.verify(token, JWT_SECRET);
            socket.jwtPayload = decoded;

            if (decoded.portalUserId && decoded.patientId && decoded.role === "Patient") {
                socket.userType      = "patient";
                socket.patientId     = decoded.patientId;
                socket.portalUserId  = decoded.portalUserId;
            } else if (decoded.userId && decoded.roleName) {
                if (decoded.roleName.toLowerCase() === "admin") {
                    return next(new Error("ADMIN_NOT_ALLOWED"));
                }
                socket.userType    = "doctor";
                socket.staffUserId = decoded.userId;   // JWT uses 'userId' key
                socket.username    = decoded.username;
            } else {
                return next(new Error("INVALID_TOKEN"));
            }

            next();
        } catch {
            next(new Error("INVALID_TOKEN"));
        }
    });

    // ── Connection ─────────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`[Chat] + ${socket.id} (${socket.userType})`);

        // ── chat:join ──────────────────────────────────────────────────────
        socket.on("chat:join", async (payload) => {
            try {
                if (socket.userType === "patient") {
                    const { doctorId } = payload;
                    if (!doctorId)
                        return socket.emit("chat:error", { message: "doctorId is required" });

                    const doctor = await Doctor.findByPk(doctorId, {
                        attributes: ["id", "firstName", "lastName"],
                    });
                    if (!doctor)
                        return socket.emit("chat:error", { message: "Doctor not found" });

                    const roomId = buildRoomId(socket.patientId, doctorId);
                    socket.currentRoom     = roomId;
                    socket.currentDoctorId = Number(doctorId);
                    socket.join(roomId);

                    socket.emit("chat:joined", {
                        roomId,
                        doctorId: doctor.id,
                        doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
                    });

                } else if (socket.userType === "doctor") {
                    const { portalUserId } = payload;
                    if (!portalUserId)
                        return socket.emit("chat:error", { message: "portalUserId is required" });

                    // Resolve Doctor profile via the username (email) stored in Doctor table
                    const doctor = await Doctor.findOne({
                        where: { email: socket.username },
                        attributes: ["id", "firstName", "lastName"],
                    });
                    if (!doctor)
                        return socket.emit("chat:error", {
                            message: "No doctor profile linked to your account",
                        });

                    const portalUser = await PortalUser.findByPk(portalUserId, {
                        attributes: ["patientId"],
                    });
                    if (!portalUser)
                        return socket.emit("chat:error", { message: "Patient portal account not found" });

                    const roomId = buildRoomId(portalUser.patientId, doctor.id);
                    socket.currentRoom         = roomId;
                    socket.currentDoctorId     = doctor.id;
                    socket.currentPortalUserId = Number(portalUserId);
                    socket.currentPatientId    = portalUser.patientId;
                    socket.join(roomId);

                    socket.emit("chat:joined", {
                        roomId,
                        portalUserId,
                        patientId:  portalUser.patientId,
                        doctorId:   doctor.id,
                    });
                }
            } catch (err) {
                console.error("[Chat] join error:", err);
                socket.emit("chat:error", { message: "Failed to join chat" });
            }
        });

        // ── chat:message ──────────────────────────────────────────────────
        socket.on("chat:message", async (payload) => {
            try {
                if (!socket.currentRoom)
                    return socket.emit("chat:error", { message: "You must join a room first" });

                const { ciphertext, iv } = payload ?? {};
                if (!ciphertext || !iv)
                    return socket.emit("chat:error", { message: "ciphertext and iv are required" });

                let record;

                if (socket.userType === "patient") {
                    // Resolve the staff user that owns the doctor profile
                    const doctor = await Doctor.findByPk(socket.currentDoctorId, {
                        attributes: ["id", "email"],
                    });
                    const staffUser = doctor?.email
                        ? await User.unscoped().findOne({
                              where: { username: doctor.email },
                              attributes: ["id"],
                          })
                        : null;

                    record = await ChatMessage.create({
                        patientId:    socket.patientId,
                        portalUserId: socket.portalUserId,
                        doctorId:     socket.currentDoctorId,
                        staffUserId:  staffUser?.id ?? socket.currentDoctorId, // fallback
                        senderType:   "patient",
                        ciphertext,
                        iv,
                    });
                } else {
                    record = await ChatMessage.create({
                        patientId:    socket.currentPatientId,
                        portalUserId: socket.currentPortalUserId,
                        doctorId:     socket.currentDoctorId,
                        staffUserId:  socket.staffUserId,
                        senderType:   "doctor",
                        ciphertext,
                        iv,
                    });
                }

                // Broadcast to ALL sockets in the room (including sender)
                io.to(socket.currentRoom).emit("chat:message", {
                    id:         record.id,
                    senderType: record.senderType,
                    ciphertext: record.ciphertext,
                    iv:         record.iv,
                    createdAt:  record.createdAt,
                });

            } catch (err) {
                console.error("[Chat] message error:", err);
                socket.emit("chat:error", { message: "Failed to send message" });
            }
        });

        // ── chat:typing ────────────────────────────────────────────────────
        socket.on("chat:typing", (payload) => {
            if (!socket.currentRoom) return;
            socket.to(socket.currentRoom).emit("chat:typing", {
                senderType: socket.userType,
                isTyping:   !!payload?.isTyping,
            });
        });

        socket.on("disconnect", () => {
            console.log(`[Chat] - ${socket.id}`);
        });
    });

    return io;
};
