import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const NotificationPreference = sequelize.define(
    "NotificationPreference",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        portalUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "portal_users",
                key: "id"
            },
            onDelete: "CASCADE",
        },
        emailOnCritical: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        emailOnAppointment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        emailOnPrescription: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        emailOnMessage: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        preferredContactMethod: {
            type: DataTypes.ENUM("email", "sms", "none"),
            defaultValue: "email",
        }
    },
    {
        tableName: "notification_preferences",
        timestamps: true,
    }
);

export default NotificationPreference;
