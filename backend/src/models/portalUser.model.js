import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const PortalUser = sequelize.define(
    "PortalUser",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        patientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, // 1 Patient = 1 PortalUser max
            references: {
                model: "patients",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        verificationToken: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        resetToken: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        resetTokenExpiry: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "portal_users",
        timestamps: true,
        paranoid: true,
        defaultScope: {
            attributes: { exclude: ["passwordHash", "verificationToken", "resetToken", "resetTokenExpiry"] }
        }
    }
);

export default PortalUser;
