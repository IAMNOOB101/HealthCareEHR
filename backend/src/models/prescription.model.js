import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Prescription = sequelize.define("Prescription", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    doctorId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    medicationId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    prescriptionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    dosage: {
        type: DataTypes.STRING,
        allowNull: false
    },
    frequency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: false
    },
    refills: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM("Active", "Completed", "Cancelled", "Upcoming"),
        defaultValue: "Active"
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "prescriptions",
    timestamps: true,
    paranoid: true
});

export default Prescription;