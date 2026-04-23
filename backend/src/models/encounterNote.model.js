import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const EncounterNote = sequelize.define("EncounterNote", {
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
    appointmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    encounterDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    chiefComplaint: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    diagnosis: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    treatmentPlan: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "encounter_notes",
    timestamps: true,
    paranoid: true
});

export default EncounterNote;