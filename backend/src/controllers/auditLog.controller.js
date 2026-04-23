import { AuditLog, User } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

// GET /api/audit-logs
const getAllAuditLogs = async (req, res) => {
    const { userId, resource, action, startDate, endDate } = req.query;

    try {
        const where = {};
        if (userId) where.userId = userId;
        if (resource) where.resource = resource;
        if (action) where.action = action;

        // Date range filtering
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.$gte = new Date(startDate);
            if (endDate) where.createdAt.$lte = new Date(endDate);
        }

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await AuditLog.findAndCountAll({
            where,
            include: [{ model: User, attributes: ["id", "username"] }],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });

        return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        console.error("getAllAuditLogs error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/audit-logs/resource/:resource/:resourceId
const getAuditLogsByResource = async (req, res) => {
    const { resource, resourceId } = req.params;

    try {
        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await AuditLog.findAndCountAll({
            where: { resource, resourceId: String(resourceId) },
            include: [{ model: User, attributes: ["id", "username"] }],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });

        return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        console.error("getAuditLogsByResource error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllAuditLogs,
    getAuditLogsByResource
};
