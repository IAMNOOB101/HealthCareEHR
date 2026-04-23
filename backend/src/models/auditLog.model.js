import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const AuditLog = sequelize.define(
    "AuditLog",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Could be null if action is system-generated or pre-auth
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "SET NULL", // Keep logs even if user is deleted
        },
        action: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        resource: {
            type: DataTypes.STRING(100),
            allowNull: false, // E.g., 'Patient', 'Prescription'
        },
        resourceId: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        details: {
            type: DataTypes.JSONB,
            allowNull: true, // JSON payload describing the specific change
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
    },
    {
        tableName: "audit_logs",
        timestamps: true,
        updatedAt: false, // Audit logs are append-only, no updates
    }
);

export default AuditLog;
