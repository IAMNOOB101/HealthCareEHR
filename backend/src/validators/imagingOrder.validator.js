import Joi from "joi";

export const createImagingOrderV = Joi.object({
    patientId:          Joi.number().integer().required(),
    doctorId:           Joi.number().integer().optional(),
    encounterId:        Joi.number().integer().optional(),
    imagingType:        Joi.string()
        .valid("X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "Mammography", "Echocardiogram")
        .optional(),
    bodyPart:           Joi.string().optional().allow('', null),
    priority:           Joi.string().valid("Routine", "Urgent", "STAT").optional(),
    clinicalReason:     Joi.string().optional().allow('', null),
    clinicalIndication: Joi.string().optional().allow('', null),
    scheduledAt:        Joi.date().iso().optional(),
    notes:              Joi.string().optional().allow('', null),
});

export const updateImagingOrderV = Joi.object({
    status:     Joi.string().valid("Ordered", "Scheduled", "In Progress", "Completed", "Cancelled", "Rejected").optional(),
    resultUrl:  Joi.string().uri().optional(),
    scheduledAt: Joi.date().iso().optional()
}).min(1);
