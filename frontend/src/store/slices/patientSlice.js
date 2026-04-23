import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { patientService } from '../../api/patient.service';

// NOTE: axiosClient interceptor already unwraps axios response.data,
// so here res = { success, data, count, message } from the backend.

export const fetchPatients = createAsyncThunk(
  'patients/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await patientService.getAllPatients(params);
      // Backend returns { success, totalItems, items: [...], totalPages, currentPage }
      // axiosClient unwraps response.data so res IS that object
      return res.items ?? res.data ?? res;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patients');
    }
  }
);

export const fetchPatientById = createAsyncThunk(
  'patients/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await patientService.getPatientById(id);
      return res.data ?? res;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient');
    }
  }
);

export const createPatient = createAsyncThunk(
  'patients/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await patientService.createPatient(data);
      return res.data ?? res;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create patient');
    }
  }
);

export const updatePatient = createAsyncThunk(
  'patients/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await patientService.updatePatient(id, data);
      return res.data ?? res;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update patient');
    }
  }
);

export const deletePatient = createAsyncThunk(
  'patients/delete',
  async (id, { rejectWithValue }) => {
    try {
      await patientService.deletePatient(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete patient');
    }
  }
);

// Creates a login account for a patient — POST /api/auth/register
export const createPatientLogin = createAsyncThunk(
  'patients/createLogin',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const { default: axiosClient } = await import('../../api/axiosClient');
      const res = await axiosClient.post('/auth/register', { username, password, roleId: 4 });
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create login account');
    }
  }
);

const patientSlice = createSlice({
  name: 'patients',
  initialState: {
    list: [],
    currentPatient: null,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearCurrentPatient: (state) => { state.currentPatient = null; },
  },
  extraReducers: (builder) => {
    builder
      // fetchAll
      .addCase(fetchPatients.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.list = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPatients.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      // fetchById
      .addCase(fetchPatientById.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPatientById.fulfilled, (state, action) => { state.loading = false; state.currentPatient = action.payload; })
      .addCase(fetchPatientById.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      // create
      .addCase(createPatient.pending,   (state) => { state.saving = true; })
      .addCase(createPatient.fulfilled, (state, action) => { state.saving = false; state.list.unshift(action.payload); })
      .addCase(createPatient.rejected,  (state, action) => { state.saving = false; state.error = action.payload; })

      // update
      .addCase(updatePatient.pending,   (state) => { state.saving = true; })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.saving = false;
        const idx = state.list.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.currentPatient?.id === action.payload.id) state.currentPatient = action.payload;
      })
      .addCase(updatePatient.rejected,  (state, action) => { state.saving = false; state.error = action.payload; })

      // delete
      .addCase(deletePatient.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      });
  },
});

export const { clearCurrentPatient } = patientSlice.actions;
export default patientSlice.reducer;
