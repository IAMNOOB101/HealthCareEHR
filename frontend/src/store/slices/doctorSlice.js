import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { doctorService } from '../../api/doctor.service';

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchDoctors = createAsyncThunk(
  'doctors/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await doctorService.getAll(params);
      // Backend returns paginated: { success, totalItems, items: [...], totalPages, currentPage }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch doctors');
    }
  }
);

export const fetchDoctorById = createAsyncThunk(
  'doctors/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await doctorService.getById(id);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch doctor');
    }
  }
);

export const createDoctor = createAsyncThunk(
  'doctors/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await doctorService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create doctor');
    }
  }
);

export const updateDoctor = createAsyncThunk(
  'doctors/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await doctorService.update(id, data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update doctor');
    }
  }
);

// Creates a staff login account for a doctor — POST /api/auth/register
// Doctor role is roleId=2 per the seeder order (Admin=1, Doctor=2, Nurse=3...)
export const createDoctorLogin = createAsyncThunk(
  'doctors/createLogin',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const { default: axiosClient } = await import('../../api/axiosClient');
      const res = await axiosClient.post('/auth/register', { username, password, roleId: 2 });
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create login account');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const doctorSlice = createSlice({
  name: 'doctors',
  initialState: {
    list: [],
    currentDoctor: null,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearCurrentDoctor: (state) => { state.currentDoctor = null; },
  },
  extraReducers: (builder) => {
    const setPending  = (state) => { state.loading = true;  state.error = null; };
    const setRejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchDoctors.pending,   setPending)
      .addCase(fetchDoctors.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = Array.isArray(payload) ? payload : [];
      })
      .addCase(fetchDoctors.rejected,  setRejected)

      .addCase(fetchDoctorById.pending,   setPending)
      .addCase(fetchDoctorById.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentDoctor = payload;
      })
      .addCase(fetchDoctorById.rejected,  setRejected)

      .addCase(createDoctor.pending,   (state) => { state.saving = true; })
      .addCase(createDoctor.fulfilled, (state, { payload }) => {
        state.saving = false;
        state.list.unshift(payload);
      })
      .addCase(createDoctor.rejected,  (state, action) => { state.saving = false; state.error = action.payload; })

      .addCase(updateDoctor.pending,   (state) => { state.saving = true; })
      .addCase(updateDoctor.fulfilled, (state, { payload }) => {
        state.saving = false;
        const idx = state.list.findIndex((d) => d.id === payload.id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(updateDoctor.rejected,  (state, action) => { state.saving = false; state.error = action.payload; });
  },
});

export const { clearCurrentDoctor } = doctorSlice.actions;
export default doctorSlice.reducer;
