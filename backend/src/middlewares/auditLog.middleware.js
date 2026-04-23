import { logAction } from "../utils/auditLogger.js";

/**
 * Global Audit Middleware
 * Intercepts POST, PUT, PATCH, and DELETE requests and logs them asynchronously
 * after the response finishes.
 * 
 * Captures request payloads while redacting PII/Security fields (passwords, tokens).
 */
const SENSITIVE_FIELDS = ["password", "passwordHash", "token", "verificationToken", "resetToken", "token"];

const redact = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const redacted = { ...obj };
    for (const key in redacted) {
        if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
            redacted[key] = "[REDACTED]";
        } else if (typeof redacted[key] === "object") {
            redacted[key] = redact(redacted[key]);
        }
    }
    return redacted;
};

export const auditLogMiddleware = (req, res, next) => {
    // Only intercept mutating write requests
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        res.on("finish", async () => {
            // If the response wasn't a success (200-299 status code), we skip logging 
            // OR log it as a failed attempt depending on requirements.
            // For now, logging successful operations only:
            if (res.statusCode >= 200 && res.statusCode < 300) {
                
                // Try to infer resource from the URL path (e.g. /api/patients -> Patient)
                const segments = req.baseUrl.split("/");
                const routeName = segments[segments.length - 1]; 
                
                // Formulate a friendly resource name
                const resourceMapping = {
                    "patients": "Patient",
                    "doctors": "Doctor",
                    "appointments": "Appointment",
                    "encounters": "EncounterNote",
                    "prescriptions": "Prescription",
                    "lab-orders": "LabOrder",
                    "lab-results": "LabResult",
                    "imaging-orders": "ImagingOrder",
                    "medications": "Medication",
                    "mar": "MAR",
                    "progress-notes": "ProgressNote"
                };

                const resource = resourceMapping[routeName] || routeName || "UnknownResource";

                // Action Mapping
                let action = "UPDATE";
                if (req.method === "POST") action = "CREATE";
                if (req.method === "DELETE") action = "DELETE";

                // Attempt to grab resource ID from params or body
                const resourceId = req.params?.id || (req.body && req.body.id) || null;

                // Fire async audit logger safely
                await logAction({
                    userId: req.user ? req.user.id : (req.portalUser ? req.portalUser.id : null),
                    action,
                    resource,
                    resourceId,
                    details: { 
                        method: req.method,
                        originalUrl: req.originalUrl,
                        payload: redact(req.body)
                    },
                    ipAddress: req.ip
                });
            }
        });
    }
    next();
};
