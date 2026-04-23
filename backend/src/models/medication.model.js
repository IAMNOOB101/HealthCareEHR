import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Medication = sequelize.define("Medication", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    medicationName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dosage: {
        type: DataTypes.STRING,
        allowNull: false
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sideEffects: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    contraindications: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "medications",
    timestamps: true,
    paranoid: true
});

export default Medication;