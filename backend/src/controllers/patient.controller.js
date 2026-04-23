import { Op } from "sequelize";
import { Patient } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

// GET /api/patients
const getAllPatients = async (req, res) => {
    const { gender, name } = req.query;

    try {
        const where = {};
        if (gender) where.gender = gender;
        if (name) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${name}%` } },
                { lastName:  { [Op.iLike]: `%${name}%` } }
            ];
        }

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Patient.findAndCountAll({
            where,
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllPatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient)
            return res.status(404).json({ success: false, message: `Patient with ID ${req.params.id} not found` });

        return res.status(200).json({ success: true, data: patient });
    } catch (err) {
        console.error("getPatientById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/patients
const createPatientHandler = async (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, contactInformation, insuranceDetails, bloodType, emergencyContact } = req.body;

    const missing = [];
    if (!firstName)   missing.push("firstName");
    if (!lastName)    missing.push("lastName");
    if (!dateOfBirth) missing.push("dateOfBirth");
    if (!gender)      missing.push("gender");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    const validGenders = ["Male", "Female", "Other"];
    if (!validGenders.includes(gender))
        return res.status(400).json({ success: false, message: `Invalid gender. Must be one of: ${validGenders.join(", ")}` });

    try {
        // Duplicate email check only when provided
        if (contactInformation?.email) {
            const existing = await Patient.findOne({
                where: { contactInformation: { email: contactInformation.email } }
            });
            if (existing)
                return res.status(409).json({ success: false, message: "A patient with this email already exists" });
        }

        const patient = await Patient.create({
            firstName, lastName, dateOfBirth, gender,
            bloodType:        bloodType        || null,
            emergencyContact: emergencyContact || null,
            contactInformation: {
                email:   contactInformation?.email   || "",
                phone:   contactInformation?.phone   || "",
                address: contactInformation?.address || ""
            },
            insuranceDetails: {
                provider:     insuranceDetails?.provider     || "",
                policyNumber: insuranceDetails?.policyNumber || "",
                groupNumber:  insuranceDetails?.groupNumber  || ""
            }
        });

        return res.status(201).json({ success: true, message: "Patient created successfully", data: patient });
    } catch (err) {
        console.error("createPatient error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// PUT /api/patients/:id
const updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient)
            return res.status(404).json({ success: false, message: `Patient with ID ${req.params.id} not found` });

        // Check email conflict on update
        if (req.body.contactInformation?.email) {
            const conflict = await Patient.findOne({
                where: {
                    contactInformation: { email: req.body.contactInformation.email },
                    id: { [Op.ne]: req.params.id }
                }
            });
            if (conflict)
                return res.status(409).json({ success: false, message: "Email already exists" });
        }

        const { firstName, lastName, dateOfBirth, gender, contactInformation, insuranceDetails, bloodType, emergencyContact } = req.body;

        await patient.update({
            ...(firstName  && { firstName }),
            ...(lastName   && { lastName }),
            ...(dateOfBirth && { dateOfBirth }),
            ...(gender     && { gender }),
            ...(bloodType  !== undefined && { bloodType }),
            ...(emergencyContact !== undefined && { emergencyContact }),
            ...(contactInformation && {
                contactInformation: { ...patient.contactInformation, ...contactInformation }
            }),
            ...(insuranceDetails && {
                insuranceDetails: { ...patient.insuranceDetails, ...insuranceDetails }
            })
        });

        return res.status(200).json({ success: true, message: "Patient updated successfully", data: patient });
    } catch (err) {
        console.error("updatePatient error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/patients/:id
const deletePatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient)
            return res.status(404).json({ success: false, message: `Patient with ID ${req.params.id} not found` });

        await patient.destroy();

        return res.status(200).json({ success: true, message: "Patient deleted successfully" });
    } catch (err) {
        console.error("deletePatient error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { getAllPatients, getPatientById, createPatientHandler, updatePatient, deletePatient };
