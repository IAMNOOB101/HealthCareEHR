import Joi from "joi";

export const createPatientV = Joi.object({
    firstName:        Joi.string().required(),
    lastName:         Joi.string().required(),
    dateOfBirth:      Joi.date().iso().required(),
    gender:           Joi.string().valid('Male', 'Female', 'Other').required(),
    // Optional top-level fields sent by the frontend form
    bloodType:        Joi.string().optional().allow('', null),
    emergencyContact: Joi.string().optional().allow('', null),
    contactInformation: Joi.object({
        phone:   Joi.string().optional().allow('', null),
        email:   Joi.string().email().optional().allow('', null),
        address: Joi.string().optional().allow('', null),
    }).optional(),
    insuranceDetails: Joi.object({
        provider:     Joi.string().optional().allow('', null),
        policyNumber: Joi.string().optional().allow('', null),
        groupNumber:  Joi.string().optional().allow('', null),
    }).optional(),
});

export const updatePatientV = Joi.object({
    firstName:        Joi.string().optional(),
    lastName:         Joi.string().optional(),
    dateOfBirth:      Joi.date().iso().optional(),
    gender:           Joi.string().valid('Male', 'Female', 'Other').optional(),
    bloodType:        Joi.string().optional().allow('', null),
    emergencyContact: Joi.string().optional().allow('', null),
    contactInformation: Joi.object({
        phone:   Joi.string().optional().allow('', null),
        email:   Joi.string().email().optional().allow('', null),
        address: Joi.string().optional().allow('', null),
    }).optional(),
    insuranceDetails: Joi.object({
        provider:     Joi.string().optional().allow('', null),
        policyNumber: Joi.string().optional().allow('', null),
        groupNumber:  Joi.string().optional().allow('', null),
    }).optional(),
}).min(1);
