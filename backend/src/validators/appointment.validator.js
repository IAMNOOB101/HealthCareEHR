import Joi from "joi";

export const createAppointmentV = Joi.object({
    patientId:       Joi.number().integer().required(),
    doctorId:        Joi.number().integer().required(),
    appointmentDate: Joi.date().iso().required(),
    appointmentType: Joi.string()
        .valid('Consultation', 'Follow-up', 'Surgery', 'Emergency', 'Routine Check-up')
        .required(),
    status: Joi.string()
        .valid('Scheduled', 'Completed', 'Cancelled', 'No-Show', 'No Show')
        .optional(),
    reason: Joi.string().optional().allow('', null),
    notes:  Joi.string().optional().allow('', null),
});

export const updateAppointmentV = Joi.object({
    patientId:       Joi.number().integer().optional(),
    doctorId:        Joi.number().integer().optional(),
    appointmentDate: Joi.date().iso().optional(),
    appointmentType: Joi.string()
        .valid('Consultation', 'Follow-up', 'Surgery', 'Emergency', 'Routine Check-up')
        .optional(),
    status: Joi.string()
        .valid('Scheduled', 'Completed', 'Cancelled', 'No-Show', 'No Show')
        .optional(),
    reason: Joi.string().optional().allow('', null),
    notes:  Joi.string().optional().allow('', null),
}).min(1);
