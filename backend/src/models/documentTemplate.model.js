import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const DocumentTemplate = sequelize.define("DocumentTemplate", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    templateName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    specialty: {
        type: DataTypes.ENUM(
            "General Practice",
            "Cardiology",
            "Orthopedics",
            "Neurology",
            "Pediatrics",
            "Oncology",
            "Dermatology",
            "Psychiatry",
            "Radiology",
            "Emergency Medicine",
            "Obstetrics & Gynecology",
            "Gastroenterology",
            "Endocrinology",
            "Pulmonology",
            "Nephrology"
        ),
        allowNull: false
    },
    // JSONB allows flexible, dynamic section definitions per specialty:
    // e.g. [{ "sectionName": "Chief Complaint", "fieldType": "textarea", "required": true }]
    sections: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // FK to User — tracks who created the template
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "document_templates",
    timestamps: true,
    paranoid: true
});

export default DocumentTemplate;
