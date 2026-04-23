import axiosClient from './axiosClient';

// Backend routes: /api/appointments
// GET    /                        → all appointments (with filters)
// GET    /patient/:patientId      → by patient
// GET    /doctor/:doctorId        → by doctor
// GET    /:id                     → single appointment
// POST   /                        → create
// PUT    /:id                     → update (status, time, etc.)
// DELETE /:id                     → cancel

export const appointmentService = {
  getAll:        (params)          => axiosClient.get('/appointments', { params }),
  getByPatient:  (patientId)       => axiosClient.get(`/appointments/patient/${patientId}`),
  getByDoctor:   (doctorId)        => axiosClient.get(`/appointments/doctor/${doctorId}`),
  getById:       (id)              => axiosClient.get(`/appointments/${id}`),
  create:        (data)            => axiosClient.post('/appointments', data),
  update:        (id, data)        => axiosClient.put(`/appointments/${id}`, data),
  cancel:        (id)              => axiosClient.delete(`/appointments/${id}`),
};
