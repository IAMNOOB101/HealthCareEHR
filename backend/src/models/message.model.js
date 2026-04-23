import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Message = sequelize.define(
    "Message",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        patientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "patients",
                key: "id"
            },
            onDelete: "CASCADE",
        },
        portalUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "portal_users",
                key: "id"
            },
            onDelete: "CASCADE",
        },
        staffUserId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Can be null if patient is sending to general "Care Team"
            references: {
                model: "users",
                key: "id"
            },
            onDelete: "SET NULL",
        },
        direction: {
            type: DataTypes.ENUM("patient-to-staff", "staff-to-patient"),
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Used for reply threading
        }
    },
    {
        tableName: "messages",
        timestamps: true,
        paranoid: true,
    }
);

export default Message;
