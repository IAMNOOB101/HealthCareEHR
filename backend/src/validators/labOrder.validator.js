import Joi from "joi";

export const createLabOrderV = Joi.object({
    patientId:          Joi.number().integer().required(),
    doctorId:           Joi.number().integer().optional(),   // optional from global view
    testType:           Joi.string().optional().allow('', null),
    testName:           Joi.string().optional().allow('', null),
    panelName:          Joi.string().optional().allow('', null),
    orderDate:          Joi.date().iso().optional(),
    priority:           Joi.string().valid("Routine", "Urgent", "STAT").optional(),
    clinicalIndication: Joi.string().optional().allow('', null),
    notes:              Joi.string().optional().allow('', null),
});

export const updateLabOrderV = Joi.object({
    status: Joi.string().valid("Pending", "In Progress", "Completed", "Cancelled").required()
});
