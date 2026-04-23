import { Op } from "sequelize";
import { Doctor } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

// GET /api/doctors
const getAllDoctors = async (req, res) => {
    const { specialization } = req.query;

    try {
        const where = {};
        if (specialization) where.specialization = { [Op.iLike]: specialization };

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Doctor.findAndCountAll({
            where,
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllDoctors error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        return res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        console.error("getDoctorById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/doctors
const createDoctorHandler = async (req, res) => {
    const { firstName, lastName, specialization, department, email, phone, licenseNumber } = req.body;

    // Only the three core fields are truly required
    const missing = [];
    if (!firstName)      missing.push("firstName");
    if (!lastName)       missing.push("lastName");
    if (!specialization) missing.push("specialization");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    try {
        // Duplicate checks only when values are actually provided
        if (licenseNumber) {
            const licenseDup = await Doctor.findOne({ where: { licenseNumber } });
            if (licenseDup)
                return res.status(409).json({ success: false, message: "A doctor with this license number already exists" });
        }

        if (email) {
            const emailDup = await Doctor.findOne({ where: { email: { [Op.iLike]: email } } });
            if (emailDup)
                return res.status(409).json({ success: false, message: "A doctor with this email already exists" });
        }

        const doctor = await Doctor.create({
            firstName,
            lastName,
            specialization,
            department:    department    || null,
            email:         email         || null,
            phone:         phone         || null,
            licenseNumber: licenseNumber || null,
        });
        return res.status(201).json({ success: true, data: doctor });
    } catch (err) {
        console.error("createDoctor error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// PUT /api/doctors/:id
const updateDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        if (req.body.licenseNumber) {
            const dup = await Doctor.findOne({
                where: {
                    licenseNumber: req.body.licenseNumber,
                    id: { [Op.ne]: req.params.id }
                }
            });
            if (dup)
                return res.status(409).json({ success: false, message: "License number already exists" });
        }

        await doctor.update(req.body);
        return res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        console.error("updateDoctor error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/doctors/:id
const deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        await doctor.destroy();
        return res.status(200).json({ success: true, message: "Doctor deleted successfully" });
    } catch (err) {
        console.error("deleteDoctor error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PATCH /api/doctors/:id/deactivate
const deactivateDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        await doctor.update({ isActive: false });
        return res.status(200).json({ success: true, message: "Doctor deactivated successfully" });
    } catch (err) {
        console.error("deactivateDoctor error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { getAllDoctors, getDoctorById, createDoctorHandler, updateDoctor, deleteDoctor, deactivateDoctor };