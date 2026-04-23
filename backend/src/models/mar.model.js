import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const MAR = sequelize.define("MAR", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    prescriptionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    medicationId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // The staff member (Nurse/Doctor) who administered or recorded the dose
    administeredBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false   // When the dose was supposed to be given
    },
    administeredAt: {
        type: DataTypes.DATE,
        allowNull: true    // When it was actually given (null if Missed/Refused/Held)
    },
    dose: {
        type: DataTypes.STRING,
        allowNull: false   // Actual dose given (may differ from prescribed in emergency)
    },
    route: {
        type: DataTypes.ENUM("Oral", "IV", "IM", "Subcutaneous", "Topical", "Inhaled", "Sublingual", "Rectal"),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM("Given", "Missed", "Delayed", "Refused", "Held"),
        defaultValue: "Given"
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true    // Required for Missed/Refused/Held — reason why
    }
}, {
    tableName: "medication_administration_records",
    timestamps: true,
    paranoid: true
});

export default MAR;
