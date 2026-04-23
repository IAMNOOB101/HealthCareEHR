import { EncounterNote, Patient, Doctor, Appointment, sequelize } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

// GET /api/encounters
const getAllEncounterNotes = async (req, res) => {
    const { patientId, doctorId, appointmentId } = req.query;

    try {
        const where = {};
        if (patientId) where.patientId = patientId;
        if (doctorId) where.doctorId = doctorId;
        if (appointmentId) where.appointmentId = appointmentId;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await EncounterNote.findAndCountAll({
            where,
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor, attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: Appointment, attributes: ["id", "appointmentDate", "appointmentType"] }
            ],
            order: [["encounterDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllEncounterNotes error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/encounters/:id
const getEncounterNoteById = async (req, res) => {
    try {
        const note = await EncounterNote.findByPk(req.params.id, {
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor, attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: Appointment, attributes: ["id", "appointmentDate", "appointmentType"] }
            ]
        });
        if (!note)
            return res.status(404).json({ success: false, message: "Encounter note not found" });

        return res.status(200).json({ success: true, data: note });
    } catch (err) {
        console.error("getEncounterNoteById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/encounters/patient/:patientId
const getEncounterNotesByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await EncounterNote.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [{ model: Doctor, attributes: ["id", "firstName", "lastName"] }],
            order: [["encounterDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getEncounterNotesByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/encounters/doctor/:doctorId
const getEncounterNotesByDoctorId = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await EncounterNote.findAndCountAll({
            where: { doctorId: req.params.doctorId },
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }],
            order: [["encounterDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getEncounterNotesByDoctorId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/encounters
const createEncounterNoteHandler = async (req, res) => {
    const { patientId, doctorId, appointmentId, encounterDate, chiefComplaint, diagnosis, treatmentPlan, notes } = req.body;

    const t = await sequelize.transaction();

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        const appointment = await Appointment.findByPk(appointmentId);
        if (!appointment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (appointment.patientId !== parseInt(patientId)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Appointment does not belong to this patient" });
        }

        if (appointment.doctorId !== parseInt(doctorId)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Appointment does not belong to this doctor" });
        }

        // Prevent duplicate encounter note per appointment (unique constraint in DB)
        const exists = await EncounterNote.findOne({ where: { appointmentId } });
        if (exists) {
            await t.rollback();
            return res.status(409).json({ success: false, message: "An encounter note already exists for this appointment" });
        }

        const note = await EncounterNote.create({
            patientId, doctorId, appointmentId, encounterDate,
            chiefComplaint, diagnosis, treatmentPlan, notes
        }, { transaction: t });

        // Auto-complete appointment
        await appointment.update({ status: "Completed" }, { transaction: t });

        await t.commit();
        return res.status(201).json({ success: true, data: note });
    } catch (err) {
        await t.rollback();
        console.error("createEncounterNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/encounters/:id
const updateEncounterNote = async (req, res) => {
    try {
        const note = await EncounterNote.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ success: false, message: "Encounter note not found" });

        // Prevent FK overrides
        const { patientId: _, doctorId: __, appointmentId: ___, ...updateData } = req.body;
        await note.update(updateData);

        return res.status(200).json({ success: true, data: note });
    } catch (err) {
        console.error("updateEncounterNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/encounters/:id
const deleteEncounterNote = async (req, res) => {
    try {
        const note = await EncounterNote.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ success: false, message: "Encounter note not found" });

        await note.destroy();
        return res.status(200).json({ success: true, message: "Encounter note deleted successfully" });
    } catch (err) {
        console.error("deleteEncounterNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllEncounterNotes,
    getEncounterNoteById,
    getEncounterNotesByPatientId,
    getEncounterNotesByDoctorId,
    createEncounterNoteHandler,
    updateEncounterNote,
    deleteEncounterNote
};
