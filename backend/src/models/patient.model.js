import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Patient = sequelize.define("Patient", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM("Male", "Female", "Other"),
        allowNull: false
    },
    bloodType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    emergencyContact: {
        type: DataTypes.STRING,
        allowNull: true
    },
    contactInformation: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    insuranceDetails: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    }
}, {
    tableName: "patients",
    timestamps: true,
    paranoid: true
});

export default Patient;