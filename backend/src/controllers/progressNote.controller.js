import { Op } from "sequelize";
import { ProgressNote, Patient, Doctor, EncounterNote } from "../models/index.js";

const VALID_NOTE_TYPES = ["SOAP", "Narrative", "Problem-Oriented"];

// GET /api/progress-notes
const getAllProgressNotes = async (req, res) => {
    const { patientId, doctorId, encounterId, noteType, from, to } = req.query;

    try {
        const where = {};
        if (patientId)   where.patientId   = patientId;
        if (doctorId)    where.doctorId    = doctorId;
        if (encounterId) where.encounterId = encounterId;
        if (noteType)    where.noteType    = noteType;

        // Optional date range filter
        if (from || to) {
            where.noteDate = {};
            if (from) where.noteDate[Op.gte] = new Date(from);
            if (to)   where.noteDate[Op.lte] = new Date(to);
        }

        const notes = await ProgressNote.findAll({
            where,
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,        attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: EncounterNote, as: "encounter", attributes: ["id", "encounterDate", "chiefComplaint"], required: false }
            ],
            order: [["noteDate", "DESC"]]
        });

        return res.status(200).json({ success: true, count: notes.length, data: notes });
    } catch (err) {
        console.error("getAllProgressNotes error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/progress-notes/:id
const getProgressNoteById = async (req, res) => {
    try {
        const note = await ProgressNote.findByPk(req.params.id, {
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,        attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: EncounterNote, as: "encounter", attributes: ["id", "encounterDate", "chiefComplaint", "diagnosis"], required: false }
            ]
        });

        if (!note)
            return res.status(404).json({ success: false, message: "Progress note not found" });

        return res.status(200).json({ success: true, data: note });
    } catch (err) {
        console.error("getProgressNoteById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/progress-notes/patient/:patientId
const getProgressNotesByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const notes = await ProgressNote.findAll({
            where: { patientId: req.params.patientId },
            include: [
                { model: Doctor,        attributes: ["id", "firstName", "lastName"] },
                { model: EncounterNote, as: "encounter", attributes: ["id", "encounterDate"], required: false }
            ],
            order: [["noteDate", "DESC"]]
        });

        return res.status(200).json({ success: true, count: notes.length, data: notes });
    } catch (err) {
        console.error("getProgressNotesByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/progress-notes
const createProgressNoteHandler = async (req, res) => {
    const {
        patientId, doctorId, encounterId,
        noteDate, noteType,
        subjectiveFindings, objectiveFindings,
        assessment, plan, narrativeContent
    } = req.body;

    const missing = [];
    if (!patientId)  missing.push("patientId");
    if (!doctorId)   missing.push("doctorId");
    if (!noteDate)   missing.push("noteDate");
    if (!assessment) missing.push("assessment");
    if (!plan)       missing.push("plan");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (noteType && !VALID_NOTE_TYPES.includes(noteType))
        return res.status(400).json({ success: false, message: `Invalid noteType. Must be one of: ${VALID_NOTE_TYPES.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        // Validate optional encounter link
        if (encounterId) {
            const encounter = await EncounterNote.findByPk(encounterId);
            if (!encounter)
                return res.status(404).json({ success: false, message: "Encounter note not found" });
            // Ensure encounter belongs to same patient
            if (encounter.patientId !== parseInt(patientId))
                return res.status(400).json({ success: false, message: "Encounter does not belong to this patient" });
        }

        const note = await ProgressNote.create({
            patientId, doctorId,
            encounterId: encounterId || null,
            noteDate,
            noteType:           noteType || "SOAP",
            subjectiveFindings: subjectiveFindings || null,
            objectiveFindings:  objectiveFindings  || null,
            assessment,
            plan,
            narrativeContent:   narrativeContent   || null
        });

        return res.status(201).json({ success: true, data: note });
    } catch (err) {
        console.error("createProgressNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/progress-notes/:id
const updateProgressNote = async (req, res) => {
    try {
        const note = await ProgressNote.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ success: false, message: "Progress note not found" });

        if (req.body.noteType && !VALID_NOTE_TYPES.includes(req.body.noteType))
            return res.status(400).json({ success: false, message: `Invalid noteType. Must be one of: ${VALID_NOTE_TYPES.join(", ")}` });

        // Prevent FK overrides
        const { patientId: _, doctorId: __, ...updateData } = req.body;
        await note.update(updateData);

        return res.status(200).json({ success: true, data: note });
    } catch (err) {
        console.error("updateProgressNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/progress-notes/:id
const deleteProgressNote = async (req, res) => {
    try {
        const note = await ProgressNote.findByPk(req.params.id);
        if (!note)
            return res.status(404).json({ success: false, message: "Progress note not found" });

        await note.destroy();
        return res.status(200).json({ success: true, message: "Progress note deleted successfully" });
    } catch (err) {
        console.error("deleteProgressNote error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllProgressNotes,
    getProgressNoteById,
    getProgressNotesByPatientId,
    createProgressNoteHandler,
    updateProgressNote,
    deleteProgressNote
};
