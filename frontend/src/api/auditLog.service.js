import axiosClient from './axiosClient';

// Backend routes: /api/audit-logs  (Admin only)
// GET /                                       → all logs (paginated, filterable)
// GET /resource/:resource/:resourceId         → logs for a specific resource

export const auditLogService = {
  getAll:         (params)                      => axiosClient.get('/audit-logs', { params }),
  getByResource:  (resource, resourceId)        => axiosClient.get(`/audit-logs/resource/${resource}/${resourceId}`),
};
