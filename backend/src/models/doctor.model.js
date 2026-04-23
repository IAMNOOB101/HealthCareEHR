import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Doctor = sequelize.define("Doctor", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    specialization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    licenseNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "doctors",
    timestamps: true,
    paranoid: true
});

export default Doctor;