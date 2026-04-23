/**
 * Custom XSS Sanitizer Middleware
 * Recursively strips HTML tags from request body, query, and params.
 * 
 * Note: regex-based stripping is a baseline protection. 
 * For full production, DOMPurify with JSDOM is recommended.
 */
const stripTags = (input) => {
    if (typeof input !== 'string') return input;
    // Basic regex to strip HTML tags
    return input.replace(/<[^>]*>?/gm, '');
};

const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = stripTags(obj[key]);
        } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
        }
    }
};

export const sanitizerMiddleware = (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
};
