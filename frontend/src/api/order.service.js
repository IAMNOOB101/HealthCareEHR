import axiosClient from './axiosClient';

// GET /api/lab-orders/patient/:patientId
// POST /api/lab-orders
// PUT /api/lab-orders/:id

export const labOrderService = {
  getByPatient: (patientId) => axiosClient.get(`/lab-orders/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/lab-orders', { params }),
  getById: (id) => axiosClient.get(`/lab-orders/${id}`),
  create: (data) => axiosClient.post('/lab-orders', data),
  update: (id, data) => axiosClient.put(`/lab-orders/${id}`, data),
  delete: (id) => axiosClient.delete(`/lab-orders/${id}`),
};

// GET /api/imaging-orders/patient/:patientId
// POST /api/imaging-orders
// PUT /api/imaging-orders/:id

export const imagingOrderService = {
  getByPatient: (patientId) => axiosClient.get(`/imaging-orders/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/imaging-orders', { params }),
  getById: (id) => axiosClient.get(`/imaging-orders/${id}`),
  create: (data) => axiosClient.post('/imaging-orders', data),
  update: (id, data) => axiosClient.put(`/imaging-orders/${id}`, data),
  cancel: (id) => axiosClient.delete(`/imaging-orders/${id}`),
};

// GET /api/lab-results/patient/:patientId

export const labResultService = {
  getByPatient: (patientId) => axiosClient.get(`/lab-results/patient/${patientId}`),
  getAll: (params) => axiosClient.get('/lab-results', { params }),
  create: (data) => axiosClient.post('/lab-results', data),
};
