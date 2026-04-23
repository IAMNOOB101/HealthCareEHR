import { AuditLog } from "../models/index.js";

/**
 * Logs an action to the database.
 * @param {Object} params
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.action - Description of the action (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} params.resource - The affected entity (e.g., 'Patient', 'EncounterNote')
 * @param {number|string} params.resourceId - ID of the affected entity
 * @param {Object} params.details - Detailed JSON metadata (e.g., diff of changes)
 * @param {string} params.ipAddress - User IP address
 */
export const logAction = async ({ userId, action, resource, resourceId, details, ipAddress }) => {
    try {
        await AuditLog.create({
            userId: userId || null,
            action,
            resource,
            resourceId: resourceId ? String(resourceId) : null,
            details: details || null,
            ipAddress: ipAddress || null
        });
    } catch (err) {
        console.error("❌ Failed to write audit log:", err.message);
        // Do not throw; audit logging failure should generally not break the main transaction flow
    }
};
