import axiosClient from './axiosClient';

// Backend routes: /api/doctors
// GET    /            → all doctors
// GET    /:id         → single doctor
// POST   /            → create (Admin only)
// PUT    /:id         → update (Admin only)
// PATCH  /:id/deactivate → deactivate (Admin only)
// DELETE /:id         → delete (Admin only)

export const doctorService = {
  getAll:      (params)    => axiosClient.get('/doctors', { params }),
  getById:     (id)        => axiosClient.get(`/doctors/${id}`),
  create:      (data)      => axiosClient.post('/doctors', data),
  update:      (id, data)  => axiosClient.put(`/doctors/${id}`, data),
  deactivate:  (id)        => axiosClient.patch(`/doctors/${id}/deactivate`),
  delete:      (id)        => axiosClient.delete(`/doctors/${id}`),
};
