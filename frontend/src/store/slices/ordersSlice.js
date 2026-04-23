import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { labOrderService, imagingOrderService, labResultService } from '../../api/order.service';

// ── Lab Order Thunks ─────────────────────────────────────────────────────────
export const fetchLabOrdersByPatient = createAsyncThunk(
  'orders/fetchLabOrdersByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await labOrderService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      // axiosClient already unwraps response.data, so res IS that object
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch lab orders');
    }
  }
);

export const createLabOrder = createAsyncThunk(
  'orders/createLabOrder',
  async (data, { rejectWithValue }) => {
    try {
      const res = await labOrderService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create lab order');
    }
  }
);

export const updateLabOrder = createAsyncThunk(
  'orders/updateLabOrder',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await labOrderService.update(id, data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update lab order');
    }
  }
);

export const deleteLabOrder = createAsyncThunk(
  'orders/deleteLabOrder',
  async (id, { rejectWithValue }) => {
    try {
      await labOrderService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete lab order');
    }
  }
);

// ── Imaging Order Thunks ─────────────────────────────────────────────────────
export const fetchImagingOrdersByPatient = createAsyncThunk(
  'orders/fetchImagingOrdersByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await imagingOrderService.getByPatient(patientId);
      // Backend uses getPagingData → response shape: { success, items:[...], totalItems, ... }
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch imaging orders');
    }
  }
);

export const createImagingOrder = createAsyncThunk(
  'orders/createImagingOrder',
  async (data, { rejectWithValue }) => {
    try {
      const res = await imagingOrderService.create(data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create imaging order');
    }
  }
);

export const updateImagingOrder = createAsyncThunk(
  'orders/updateImagingOrder',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await imagingOrderService.update(id, data);
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update imaging order');
    }
  }
);

export const deleteImagingOrder = createAsyncThunk(
  'orders/deleteImagingOrder',
  async (id, { rejectWithValue }) => {
    try {
      await imagingOrderService.cancel(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete imaging order');
    }
  }
);

// ── Lab Result Thunks ────────────────────────────────────────────────────────
export const fetchLabResultsByPatient = createAsyncThunk(
  'orders/fetchLabResultsByPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await labResultService.getByPatient(patientId);
      return res.items ?? res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch lab results');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    labOrders: [],
    imagingOrders: [],
    labResults: [],
    allLabOrders: [],
    allImagingOrders: [],
    allLabResults: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearOrdersData: (state) => {
      state.labOrders = [];
      state.imagingOrders = [];
      state.labResults = [];
      state.error = null;
    },
    // ── Global list setters (dispatched by Orders.jsx on mount) ──────────────
    setAllLabOrders:     (state, action) => { state.allLabOrders     = action.payload || []; },
    setAllImagingOrders: (state, action) => { state.allImagingOrders = action.payload || []; },
    setAllLabResults:    (state, action) => { state.allLabResults    = action.payload || []; },
  },
  extraReducers: (builder) => {
    const setPending = (state) => { state.loading = true; state.error = null; };
    const setRejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchLabOrdersByPatient.pending, setPending)
      .addCase(fetchLabOrdersByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.labOrders = action.payload || [];
      })
      .addCase(fetchLabOrdersByPatient.rejected, setRejected)

      .addCase(createLabOrder.fulfilled, (state, action) => {
        state.labOrders.unshift(action.payload);
        state.allLabOrders.unshift(action.payload);
      })
      .addCase(updateLabOrder.fulfilled, (state, { payload }) => {
        const id1 = state.allLabOrders.findIndex((o) => o.id === payload.id);
        if (id1 !== -1) state.allLabOrders[id1] = payload;
        const id2 = state.labOrders.findIndex((o) => o.id === payload.id);
        if (id2 !== -1) state.labOrders[id2] = payload;
      })
      .addCase(deleteLabOrder.fulfilled, (state, { payload: id }) => {
        state.allLabOrders = state.allLabOrders.filter((o) => o.id !== id);
        state.labOrders = state.labOrders.filter((o) => o.id !== id);
      })

      .addCase(fetchImagingOrdersByPatient.pending, setPending)
      .addCase(fetchImagingOrdersByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.imagingOrders = action.payload || [];
      })
      .addCase(fetchImagingOrdersByPatient.rejected, setRejected)

      .addCase(createImagingOrder.fulfilled, (state, action) => {
        state.imagingOrders.unshift(action.payload);
        state.allImagingOrders.unshift(action.payload);
      })
      .addCase(updateImagingOrder.fulfilled, (state, { payload }) => {
        const id1 = state.allImagingOrders.findIndex((o) => o.id === payload.id);
        if (id1 !== -1) state.allImagingOrders[id1] = payload;
        const id2 = state.imagingOrders.findIndex((o) => o.id === payload.id);
        if (id2 !== -1) state.imagingOrders[id2] = payload;
      })
      .addCase(deleteImagingOrder.fulfilled, (state, { payload: id }) => {
        state.allImagingOrders = state.allImagingOrders.filter((o) => o.id !== id);
        state.imagingOrders = state.imagingOrders.filter((o) => o.id !== id);
      })

      .addCase(fetchLabResultsByPatient.pending, setPending)
      .addCase(fetchLabResultsByPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.labResults = action.payload || [];
      })
      .addCase(fetchLabResultsByPatient.rejected, setRejected);
  },
});

export const { clearOrdersData, setAllLabOrders, setAllImagingOrders, setAllLabResults } = ordersSlice.actions;
export default ordersSlice.reducer;
