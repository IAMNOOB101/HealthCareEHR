import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * ChatMessage – stores end-to-end encrypted chat messages between
 * a Patient (via PortalUser) and a Staff member (Doctor/Nurse).
 *
 * Security: The `ciphertext` column stores the AES-GCM encrypted payload.
 * Only the two participants share the derived conversation key, which is
 * NEVER persisted server-side. The server stores only the ciphertext,
 * the IV, and enough metadata to route messages.
 */
const ChatMessage = sequelize.define(
    "ChatMessage",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // ── Participants ──────────────────────────────────────────────────────
        patientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "patients", key: "id" },
            onDelete: "CASCADE",
        },
        portalUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "portal_users", key: "id" },
            onDelete: "CASCADE",
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "doctors", key: "id" },
            onDelete: "CASCADE",
        },
        staffUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },

        // ── Sender ────────────────────────────────────────────────────────────
        senderType: {
            type: DataTypes.ENUM("patient", "doctor"),
            allowNull: false,
        },

        // ── Encrypted Payload ─────────────────────────────────────────────────
        // The ciphertext is the AES-GCM encrypted message (base64).
        ciphertext: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        // Initialisation vector used for AES-GCM (base64, 12 bytes).
        iv: {
            type: DataTypes.STRING(32),
            allowNull: false,
        },

        // ── Status ────────────────────────────────────────────────────────────
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "chat_messages",
        timestamps: true,
        paranoid: true,
    }
);

export default ChatMessage;
