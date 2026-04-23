import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const MedicalHistory = sequelize.define("MedicalHistory", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    conditionName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    diagnosisDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "medical_histories",
    timestamps: true,
    paranoid: true
});

export default MedicalHistory;