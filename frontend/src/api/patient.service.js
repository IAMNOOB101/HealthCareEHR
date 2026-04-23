import axiosClient from './axiosClient';

export const patientService = {
  getAllPatients: (params) => {
    return axiosClient.get('/patients', { params });
  },
  getPatientById: (id) => {
    return axiosClient.get(`/patients/${id}`);
  },
  createPatient: (data) => {
    return axiosClient.post('/patients', data);
  },
  updatePatient: (id, data) => {
    return axiosClient.put(`/patients/${id}`, data);
  },
  deletePatient: (id) => {
    return axiosClient.delete(`/patients/${id}`);
  },
};
