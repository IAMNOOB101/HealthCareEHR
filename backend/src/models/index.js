import { sequelize } from "../config/database.js";
import Role                      from "./role.model.js";
import User                      from "./user.model.js";
import Patient                   from "./patient.model.js";
import Doctor                    from "./doctor.model.js";
import Medication                from "./medication.model.js";
import MedicalHistory            from "./medicalHistory.model.js";
import Appointment               from "./appointment.model.js";
import EncounterNote             from "./encounterNote.model.js";
import Prescription              from "./prescription.model.js";
import LabOrder                  from "./labOrder.model.js";
import LabResult                 from "./labResult.model.js";
import ProgressNote              from "./progressNote.model.js";
import DocumentTemplate          from "./documentTemplate.model.js";
import ImagingOrder              from "./imagingOrder.model.js";
import MAR                       from "./mar.model.js";
import MedicationReconciliation  from "./medicationReconciliation.model.js";
import AuditLog                  from "./auditLog.model.js";
import PortalUser                from "./portalUser.model.js";
import Message                   from "./message.model.js";
import NotificationPreference    from "./notificationPreference.model.js";

// Role → Users
Role.hasMany(User,    { foreignKey: "roleId", onDelete: "RESTRICT" });
User.belongsTo(Role,  { foreignKey: "roleId" });

// User → AuditLogs
User.hasMany(AuditLog,    { foreignKey: "userId", onDelete: "SET NULL" });
AuditLog.belongsTo(User,  { foreignKey: "userId" });

// Patient associations
Patient.hasMany(MedicalHistory, { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(Appointment,    { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(EncounterNote,  { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(Prescription,   { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(LabOrder,       { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(ImagingOrder,   { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(MAR,            { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(MedicationReconciliation, { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasOne(PortalUser,      { foreignKey: "patientId", onDelete: "CASCADE" });
Patient.hasMany(Message,        { foreignKey: "patientId", onDelete: "CASCADE" });

PortalUser.belongsTo(Patient, { foreignKey: "patientId" });
LabOrder.belongsTo(Patient,       { foreignKey: "patientId" });
EncounterNote.belongsTo(Patient,  { foreignKey: "patientId" });
Appointment.belongsTo(Patient,    { foreignKey: "patientId" });
Prescription.belongsTo(Patient,   { foreignKey: "patientId" });

// Doctor associations
Doctor.hasMany(Appointment,   { foreignKey: "doctorId", onDelete: "RESTRICT" });
Doctor.hasMany(EncounterNote, { foreignKey: "doctorId", onDelete: "RESTRICT" });
Doctor.hasMany(Prescription,  { foreignKey: "doctorId", onDelete: "RESTRICT" });
Doctor.hasMany(LabOrder,      { foreignKey: "doctorId", onDelete: "RESTRICT" });

Appointment.belongsTo(Doctor,   { foreignKey: "doctorId" });
EncounterNote.belongsTo(Doctor, { foreignKey: "doctorId" });
Prescription.belongsTo(Doctor,  { foreignKey: "doctorId" });
LabOrder.belongsTo(Doctor,      { foreignKey: "doctorId" });

// Appointment → EncounterNote (one-to-one)
Appointment.hasOne(EncounterNote,    { foreignKey: "appointmentId", onDelete: "CASCADE" });
EncounterNote.belongsTo(Appointment, { foreignKey: "appointmentId" });

// Medication → Prescriptions
Medication.hasMany(Prescription,   { foreignKey: "medicationId", onDelete: "RESTRICT" });
Prescription.belongsTo(Medication, { foreignKey: "medicationId" });

// LabOrder → LabResult (one-to-one)
LabOrder.hasOne(LabResult,    { foreignKey: "labOrderId", onDelete: "CASCADE" });
LabResult.belongsTo(LabOrder, { foreignKey: "labOrderId" });

// ProgressNote associations
Patient.hasMany(ProgressNote,      { foreignKey: "patientId", onDelete: "CASCADE" });
ProgressNote.belongsTo(Patient,    { foreignKey: "patientId" });

Doctor.hasMany(ProgressNote,       { foreignKey: "doctorId",  onDelete: "RESTRICT" });
ProgressNote.belongsTo(Doctor,     { foreignKey: "doctorId" });

// Optional link: EncounterNote → ProgressNote (one encounter can have many progress notes)
EncounterNote.hasMany(ProgressNote,  { foreignKey: "encounterId", onDelete: "SET NULL" });
ProgressNote.belongsTo(EncounterNote, { foreignKey: "encounterId", as: "encounter" });

// DocumentTemplate associations
User.hasMany(DocumentTemplate,          { foreignKey: "createdBy", onDelete: "RESTRICT" });
DocumentTemplate.belongsTo(User,        { foreignKey: "createdBy", as: "creator" });

// ImagingOrder associations
Patient.hasMany(ImagingOrder,           { foreignKey: "patientId", onDelete: "CASCADE" });
ImagingOrder.belongsTo(Patient,         { foreignKey: "patientId" });

Doctor.hasMany(ImagingOrder,            { foreignKey: "doctorId",  onDelete: "RESTRICT" });
ImagingOrder.belongsTo(Doctor,          { foreignKey: "doctorId" });

// Optional link: EncounterNote → ImagingOrder
EncounterNote.hasMany(ImagingOrder,     { foreignKey: "encounterId", onDelete: "SET NULL" });
ImagingOrder.belongsTo(EncounterNote,   { foreignKey: "encounterId", as: "encounter" });

// MAR (Medication Administration Record) associations
Patient.hasMany(MAR,                    { foreignKey: "patientId",      onDelete: "CASCADE" });
MAR.belongsTo(Patient,                  { foreignKey: "patientId" });

Prescription.hasMany(MAR,               { foreignKey: "prescriptionId", onDelete: "CASCADE" });
MAR.belongsTo(Prescription,             { foreignKey: "prescriptionId" });

Medication.hasMany(MAR,                 { foreignKey: "medicationId",   onDelete: "RESTRICT" });
MAR.belongsTo(Medication,               { foreignKey: "medicationId" });

User.hasMany(MAR,                       { foreignKey: "administeredBy",  onDelete: "RESTRICT" });
MAR.belongsTo(User,                     { foreignKey: "administeredBy",  as: "administrator" });

// MedicationReconciliation associations
Patient.hasMany(MedicationReconciliation,      { foreignKey: "patientId",   onDelete: "CASCADE" });
MedicationReconciliation.belongsTo(Patient,    { foreignKey: "patientId" });

User.hasMany(MedicationReconciliation,         { foreignKey: "reconciledBy", onDelete: "RESTRICT" });
MedicationReconciliation.belongsTo(User,       { foreignKey: "reconciledBy", as: "reconciler" });

EncounterNote.hasMany(MedicationReconciliation, { foreignKey: "encounterId", onDelete: "SET NULL" });
MedicationReconciliation.belongsTo(EncounterNote, { foreignKey: "encounterId" });

// Messages
PortalUser.hasMany(Message, { foreignKey: "portalUserId", onDelete: "CASCADE" });
User.hasMany(Message, { foreignKey: "staffUserId", onDelete: "SET NULL" });
Message.belongsTo(Message, { foreignKey: "parentId", as: "parentMessage" });
Message.belongsTo(PortalUser, { foreignKey: "portalUserId" });
Message.belongsTo(User, { foreignKey: "staffUserId" });

// Notification Preferences
PortalUser.hasOne(NotificationPreference, { foreignKey: "portalUserId", onDelete: "CASCADE" });
NotificationPreference.belongsTo(PortalUser, { foreignKey: "portalUserId" });

export {
    Role, User, Patient, Doctor, Medication,
    MedicalHistory, Appointment, EncounterNote,
    Prescription, LabOrder, LabResult,
    ProgressNote, DocumentTemplate,
    ImagingOrder, MAR, MedicationReconciliation,
    AuditLog,
    PortalUser, Message, NotificationPreference,
    sequelize
};