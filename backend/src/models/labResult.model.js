import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const LabResult = sequelize.define("LabResult", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    labOrderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    resultValue: {
        type: DataTypes.STRING,
        allowNull: false
    },
    resultDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    referenceRange: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM("Normal", "Abnormal", "Critical"),
        defaultValue: "Normal"
    },
    isCritical: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "lab_results",
    timestamps: true,
    paranoid: true
});

export default LabResult;