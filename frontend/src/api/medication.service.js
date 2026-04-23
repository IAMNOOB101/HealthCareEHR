import axiosClient from './axiosClient';

// GET /api/medications
// POST /api/medications

export const medicationService = {
  getAll: (params) => axiosClient.get('/medications', { params }),
  getById: (id) => axiosClient.get(`/medications/${id}`),
  create: (data) => axiosClient.post('/medications', data),
  update: (id, data) => axiosClient.put(`/medications/${id}`, data),
  delete: (id) => axiosClient.delete(`/medications/${id}`),
};

// GET /api/prescriptions/patient/:patientId
// POST /api/prescriptions
// PUT /api/prescriptions/:id

export const prescriptionService = {
  getByPatient: (patientId) => axiosClient.get(`/prescriptions/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/prescriptions', { params }),
  getById: (id) => axiosClient.get(`/prescriptions/${id}`),
  create: (data) => axiosClient.post('/prescriptions', data),
  update: (id, data) => axiosClient.put(`/prescriptions/${id}`, data),
  delete: (id) => axiosClient.delete(`/prescriptions/${id}`),
};

// GET /api/mar/patient/:patientId

export const marService = {
  getByPatient: (patientId) => axiosClient.get(`/mar/patient/${patientId}`),
};

// GET /api/appointments

export const appointmentService = {
  getAll: (params) => axiosClient.get('/appointments', { params }),
  getByPatient: (patientId) => axiosClient.get(`/appointments/patient/${patientId}`),
  create: (data) => axiosClient.post('/appointments', data),
  update: (id, data) => axiosClient.put(`/appointments/${id}`, data),
  delete: (id) => axiosClient.delete(`/appointments/${id}`),
};
