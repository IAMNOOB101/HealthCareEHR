import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const ImagingOrder = sequelize.define("ImagingOrder", {
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
    // Optional link to the encounter that triggered the imaging
    encounterId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    imagingType: {
        type: DataTypes.ENUM("X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "Mammography", "Echocardiogram"),
        allowNull: false
    },
    bodyPart: {
        type: DataTypes.STRING,
        allowNull: false   // e.g. "Chest", "Left Knee", "Brain", "Abdomen"
    },
    priority: {
        type: DataTypes.ENUM("Routine", "Urgent", "STAT"),
        defaultValue: "Routine"
    },
    status: {
        type: DataTypes.ENUM("Ordered", "Scheduled", "In Progress", "Completed", "Cancelled", "Rejected"),
        defaultValue: "Ordered"
    },
    clinicalReason: {
        type: DataTypes.TEXT,
        allowNull: true    // Why the imaging was ordered (clinical indication)
    },
    radiologistNotes: {
        type: DataTypes.TEXT,
        allowNull: true    // Radiologist's read / interpretation of the images
    },
    resultUrl: {
        type: DataTypes.STRING,
        allowNull: true    // PACS link or file URL — populated by PACS adapter later
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true    // When imaging is scheduled to occur
    },
    reportedAt: {
        type: DataTypes.DATE,
        allowNull: true    // When the radiologist filed the report
    }
}, {
    tableName: "imaging_orders",
    timestamps: true,
    paranoid: true
});

export default ImagingOrder;
