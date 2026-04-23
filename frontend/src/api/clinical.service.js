import axiosClient from './axiosClient';

// GET /api/encounters/patient/:patientId
// GET /api/encounters/:id
// GET /api/encounters
// POST /api/encounters
// PUT /api/encounters/:id
// DELETE /api/encounters/:id

export const encounterService = {
  getByPatient: (patientId) => axiosClient.get(`/encounters/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/encounters', { params }),
  getById: (id) => axiosClient.get(`/encounters/${id}`),
  create: (data) => axiosClient.post('/encounters', data),
  update: (id, data) => axiosClient.put(`/encounters/${id}`, data),
  delete: (id) => axiosClient.delete(`/encounters/${id}`),
};

// GET /api/progress-notes/patient/:patientId
// POST /api/progress-notes
// PUT /api/progress-notes/:id

export const progressNoteService = {
  getByPatient: (patientId) => axiosClient.get(`/progress-notes/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/progress-notes', { params }),
  getById: (id) => axiosClient.get(`/progress-notes/${id}`),
  create: (data) => axiosClient.post('/progress-notes', data),
  update: (id, data) => axiosClient.put(`/progress-notes/${id}`, data),
  delete: (id) => axiosClient.delete(`/progress-notes/${id}`),
};

// GET /api/medical-history/patient/:patientId
// POST /api/medical-history

export const medicalHistoryService = {
  getByPatient: (patientId) => axiosClient.get(`/medical-history/patient/${patientId}`),
  create: (data) => axiosClient.post('/medical-history', data),
  update: (id, data) => axiosClient.put(`/medical-history/${id}`, data),
};
