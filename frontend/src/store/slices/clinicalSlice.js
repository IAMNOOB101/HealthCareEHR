import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { encounterService, progressNoteService, medicalHistoryService } from '../../api/clinical.service';

// ── Encounter Thunks ─────────────────────────────────────────────────────────
export const fetchEncountersByPatient = createAsyncThunk(
  'clinical/fetchEncountersByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await encounterService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      // axiosClient already unwraps response.data, so res IS that object
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch encounters');
    }
  }
);

export const createEncounter = createAsyncThunk(
  'clinical/createEncounter',
  async (data, { rejectWithValue }) => {
    try {
      const res = await encounterService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create encounter');
    }
  }
);

// ── Progress Note Thunks ─────────────────────────────────────────────────────
export const fetchProgressNotesByPatient = createAsyncThunk(
  'clinical/fetchProgressNotesByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await progressNoteService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch progress notes');
    }
  }
);

export const createProgressNote = createAsyncThunk(
  'clinical/createProgressNote',
  async (data, { rejectWithValue }) => {
    try {
      const res = await progressNoteService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create progress note');
    }
  }
);

// ── Medical History Thunks ───────────────────────────────────────────────────
export const fetchMedicalHistoryByPatient = createAsyncThunk(
  'clinical/fetchMedicalHistoryByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await medicalHistoryService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch medical history');
    }
  }
);

const clinicalSlice = createSlice({
  name: 'clinical',
  initialState: {
    encounters: [],
    progressNotes: [],
    medicalHistory: [],
    allEncounters: [],
    allProgressNotes: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearClinicalData: (state) => {
      state.encounters = [];
      state.progressNotes = [];
      state.medicalHistory = [];
      state.error = null;
    },
    // ── Global list setters (dispatched by Documentation.jsx on mount) ────────
    setAllEncounters:    (state, action) => { state.allEncounters    = action.payload || []; },
    setAllProgressNotes: (state, action) => { state.allProgressNotes = action.payload || []; },
  },
  extraReducers: (builder) => {
    const setPending = (state) => { state.loading = true; state.error = null; };
    const setRejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchEncountersByPatient.pending, setPending)
      .addCase(fetchEncountersByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.encounters = action.payload || [];
      })
      .addCase(fetchEncountersByPatient.rejected, setRejected)

      .addCase(createEncounter.fulfilled, (state, action) => {
        state.encounters.unshift(action.payload);
        state.allEncounters.unshift(action.payload);
      })

      .addCase(fetchProgressNotesByPatient.pending, setPending)
      .addCase(fetchProgressNotesByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.progressNotes = action.payload || [];
      })
      .addCase(fetchProgressNotesByPatient.rejected, setRejected)

      .addCase(createProgressNote.fulfilled, (state, action) => {
        state.progressNotes.unshift(action.payload);
        state.allProgressNotes.unshift(action.payload);
      })

      .addCase(fetchMedicalHistoryByPatient.pending, setPending)
      .addCase(fetchMedicalHistoryByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.medicalHistory = action.payload || [];
      })
      .addCase(fetchMedicalHistoryByPatient.rejected, setRejected);
  },
});

export const { clearClinicalData, setAllEncounters, setAllProgressNotes } = clinicalSlice.actions;
export default clinicalSlice.reducer;
