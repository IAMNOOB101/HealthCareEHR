import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const MedicationReconciliation = sequelize.define("MedicationReconciliation", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // The Pharmacist or Nurse who performed the reconciliation
    reconciledBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Optional link to the encounter that triggered reconciliation (e.g. on admission)
    encounterId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reconciledAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    // Medications patient was taking before this encounter/admission
    // Array of: { medicationName, dosage, frequency, source: "self-reported|previous-EHR|pharmacy" }
    medicationsBefore: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    // Current active prescriptions in the system at time of reconciliation
    // Array of: { prescriptionId, medicationId, medicationName, dosage, frequency, status }
    medicationsAfter: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    // Auto-computed discrepancies: duplicates, conflicts, omissions, additions
    // Array of: { type: "duplicate|conflict|omission|addition", details: "...", resolved: bool }
    discrepancies: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    status: {
        type: DataTypes.ENUM("Pending Review", "Reviewed", "Completed"),
        defaultValue: "Pending Review"
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "medication_reconciliations",
    timestamps: true,
    paranoid: true
});

export default MedicationReconciliation;
