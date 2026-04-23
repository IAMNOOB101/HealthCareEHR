import Joi from "joi";

export const createDoctorV = Joi.object({
    firstName:       Joi.string().required(),
    lastName:        Joi.string().required(),
    specialization:  Joi.string().required(),
    department:      Joi.string().optional().allow('', null),
    email:           Joi.string().email().optional().allow('', null),
    phone:           Joi.string().optional().allow('', null),
    licenseNumber:   Joi.string().optional().allow('', null),
});

export const updateDoctorV = Joi.object({
    firstName:       Joi.string().optional(),
    lastName:        Joi.string().optional(),
    specialization:  Joi.string().optional(),
    department:      Joi.string().optional().allow('', null),
    email:           Joi.string().email().optional(),
    phone:           Joi.string().optional().allow('', null),
    licenseNumber:   Joi.string().optional().allow('', null),
    isActive:        Joi.boolean().optional(),
}).min(1);
