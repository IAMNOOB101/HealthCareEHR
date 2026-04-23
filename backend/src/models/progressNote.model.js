import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const ProgressNote = sequelize.define("ProgressNote", {
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
    // Optional link to an EncounterNote — a progress note may or may not
    // be tied to a formal encounter (e.g. ongoing inpatient updates)
    encounterId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    noteDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    noteType: {
        type: DataTypes.ENUM("SOAP", "Narrative", "Problem-Oriented"),
        allowNull: false,
        defaultValue: "SOAP"
    },
    // SOAP format fields
    subjectiveFindings: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "What the patient reports (S in SOAP)"
    },
    objectiveFindings: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Measurable/observable data (O in SOAP)"
    },
    assessment: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Clinician's diagnosis or assessment (A in SOAP)"
    },
    plan: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Treatment plan going forward (P in SOAP)"
    },
    // For Narrative / Problem-Oriented types
    narrativeContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Free-text content used when noteType is Narrative or Problem-Oriented"
    }
}, {
    tableName: "progress_notes",
    timestamps: true,
    paranoid: true
});

export default ProgressNote;
