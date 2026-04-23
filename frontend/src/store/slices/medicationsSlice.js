import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { medicationService, prescriptionService, marService } from '../../api/medication.service';

// ── Medication Thunks ─────────────────────────────────────────────────────────
export const fetchAllMedications = createAsyncThunk(
  'medications/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await medicationService.getAll(params);
      // Backend returns paginated: { success, totalItems, items: [...], totalPages, currentPage }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch medications');
    }
  }
);

export const createMedication = createAsyncThunk(
  'medications/createMedication',
  async (data, { rejectWithValue }) => {
    try {
      const res = await medicationService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to add medication to catalog'
      );
    }
  }
);

// ── Prescription Thunks ───────────────────────────────────────────────────────
export const fetchPrescriptionsByPatient = createAsyncThunk(
  'medications/fetchPrescriptionsByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await prescriptionService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      // axiosClient already unwraps response.data, so res IS that object
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch prescriptions');
    }
  }
);

export const fetchAllPrescriptions = createAsyncThunk(
  'medications/fetchAllPrescriptions',
  async (params = { limit: 1000 }, { rejectWithValue }) => {
    try {
      const res = await prescriptionService.getAll(params);
      // Backend returns paginated: { success, totalItems, items: [...], totalPages, currentPage }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch all prescriptions');
    }
  }
);

export const createPrescription = createAsyncThunk(
  'medications/createPrescription',
  async (data, { rejectWithValue }) => {
    try {
      const res = await prescriptionService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to create prescription'
      );
    }
  }
);

export const updatePrescription = createAsyncThunk(
  'medications/updatePrescription',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await prescriptionService.update(id, data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to update prescription'
      );
    }
  }
);

// ── MAR Thunks ───────────────────────────────────────────────────────────────
export const fetchMARByPatient = createAsyncThunk(
  'medications/fetchMAR',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await marService.getByPatient(patientId);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch MAR');
    }
  }
);

const medicationsSlice = createSlice({
  name: 'medications',
  initialState: {
    catalog: [],            // Full medication catalog
    prescriptions: [],      // Global list — all prescriptions (Medications.jsx)
    patientPrescriptions: [], // Patient-scoped list (PatientDetail.jsx)
    mar: [],                // Medication administration records
    loading: false,
    saving: false,          // Tracks createPrescription in-flight state
    error: null,
  },
  reducers: {
    clearMedicationData: (state) => {
      state.prescriptions = [];
      state.patientPrescriptions = [];
      state.mar = [];
      state.error = null;
    },
    clearPatientPrescriptions: (state) => {
      state.patientPrescriptions = [];
      state.error = null;
    },
    // Allows Medications.jsx to bulk-set all prescriptions fetched via direct service call
    setAllPrescriptions: (state, action) => {
      state.prescriptions = Array.isArray(action.payload) ? action.payload : [];
    },
  },
  extraReducers: (builder) => {
    const setPending   = (state) => { state.loading = true;  state.error = null; };
    const setRejected  = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchAllMedications.pending,   setPending)
      .addCase(fetchAllMedications.fulfilled, (state, action) => {
        state.loading = false;
        state.catalog = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllMedications.rejected,  setRejected)

      .addCase(createMedication.pending,   (state) => { state.saving = true; state.error = null; })
      .addCase(createMedication.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) {
          state.catalog.unshift(action.payload);
        }
      })
      .addCase(createMedication.rejected,  (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(fetchPrescriptionsByPatient.pending,   setPending)
      .addCase(fetchPrescriptionsByPatient.fulfilled, (state, action) => {
        state.loading = false;
        // Write to patient-scoped key — does NOT touch the global prescriptions list
        state.patientPrescriptions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPrescriptionsByPatient.rejected,  setRejected)

      .addCase(fetchAllPrescriptions.pending,   setPending)
      .addCase(fetchAllPrescriptions.fulfilled, (state, action) => {
        state.loading = false;
        // Write to global list only
        state.prescriptions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllPrescriptions.rejected,  setRejected)

      .addCase(createPrescription.pending,   (state) => { state.saving = true; state.error = null; })
      .addCase(createPrescription.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) {
          // Prepend to global list (Medications.jsx)
          state.prescriptions.unshift(action.payload);
          // Also prepend to patient-scoped list for immediate reflection in PatientDetail
          state.patientPrescriptions.unshift(action.payload);
        }
      })
      .addCase(createPrescription.rejected,  (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updatePrescription.fulfilled, (state, action) => {
        if (action.payload) {
          // Remove from current position and unshift to top to match 'updatedAt' sorting
          state.prescriptions = state.prescriptions.filter((rx) => rx.id !== action.payload.id);
          state.prescriptions.unshift(action.payload);

          const idxPatient = state.patientPrescriptions.findIndex((rx) => rx.id === action.payload.id);
          if (idxPatient !== -1) state.patientPrescriptions[idxPatient] = action.payload;
        }
      })

      .addCase(fetchMARByPatient.pending,   setPending)
      .addCase(fetchMARByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.mar = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMARByPatient.rejected,  setRejected);
  },
});

export const { clearMedicationData, clearPatientPrescriptions, setAllPrescriptions } = medicationsSlice.actions;
export default medicationsSlice.reducer;
