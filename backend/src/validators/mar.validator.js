import Joi from "joi";

export const createMarV = Joi.object({
    patientId: Joi.number().integer().required(),
    prescriptionId: Joi.number().integer().optional().allow(null),
    medicationId: Joi.number().integer().required(),
    administeredBy: Joi.number().integer().required(),
    administeredAt: Joi.date().iso().required(),
    dosageGiven: Joi.string().required(),
    route: Joi.string().valid("Oral", "IV", "IM", "Subcutaneous", "Topical", "Inhalation").required(),
    notes: Joi.string().allow('', null).optional(),
    status: Joi.string().valid("Administered", "Missed", "Refused").optional()
});
