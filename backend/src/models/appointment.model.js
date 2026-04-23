import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Appointment = sequelize.define("Appointment", {
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
    appointmentDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    appointmentType: {
        type: DataTypes.ENUM("Consultation", "Follow-up", "Emergency", "Routine Check-up"),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM("Scheduled", "Completed", "Cancelled", "No-Show"),
        defaultValue: "Scheduled"
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "appointments",
    timestamps: true,
    paranoid: true
});

export default Appointment;