import Joi from "joi";

/**
 * Validation middleware factory.
 * Usage: validate(schema) — schema is a Joi object schema.
 * Validates req.body. On failure returns 400 with a clear message.
 * On success calls next().
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, {
        abortEarly: false,      // collect ALL errors, not just the first
        allowUnknown: false,    // reject any fields not defined in schema
        stripUnknown: true      // silently remove unknown keys from req.body
    });

    if (error) {
        const messages = error.details.map(d => d.message.replace(/['"]/g, ""));
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: messages
        });
    }

    next();
};

export default validate;
