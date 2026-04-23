import Joi from "joi";

export const createLabResultSchema = Joi.object({
    labOrderId: Joi.number().integer().required(),
    resultValue: Joi.string().trim().required(),
    resultDate: Joi.date().iso().required(),
    unit: Joi.string().trim().optional().allow(""),
    referenceRange: Joi.string().trim().optional().allow(""),
    status: Joi.string().valid("Normal", "Abnormal", "Critical").optional(),
    notes: Joi.string().trim().optional().allow("")
});

export const updateLabResultSchema = Joi.object({
    resultValue: Joi.string().trim().optional(),
    resultDate: Joi.date().iso().optional(),
    unit: Joi.string().trim().optional().allow(""),
    referenceRange: Joi.string().trim().optional().allow(""),
    status: Joi.string().valid("Normal", "Abnormal", "Critical").optional(),
    notes: Joi.string().trim().optional().allow("")
}).min(1);
