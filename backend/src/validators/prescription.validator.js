import Joi from "joi";

export const createPrescriptionV = Joi.object({
    patientId: Joi.number().integer().required(),
    doctorId: Joi.number().integer().required(),
    medicationId: Joi.number().integer().required(),
    prescriptionDate: Joi.date().iso().required(),
    dosage: Joi.string().required(),
    frequency: Joi.string().required(),
    duration: Joi.string().required(),
    refills: Joi.number().integer().min(0).optional(),
    notes: Joi.string().allow('', null).optional()
});

export const updatePrescriptionV = Joi.object({
    status: Joi.string().valid("Active", "Completed", "Cancelled", "Upcoming").required()
});
