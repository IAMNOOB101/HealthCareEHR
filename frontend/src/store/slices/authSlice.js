import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialState = {
  user: JSON.parse(localStorage.getItem("ehr_user")) || null,
  token: localStorage.getItem("ehr_token") || null,
  loading: false,
  error: null,
};

// ── Login ──────────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, thunkAPI) => {
    try {
      // axiosClient interceptor unwraps response.data, so we get { success, token, user, ... }
      const res = await axiosClient.post("/auth/login", credentials);
      return res;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Login failed";
      return thunkAPI.rejectWithValue(message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("ehr_token");
      localStorage.removeItem("ehr_user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        // Backend response shape: { success: true, data: { token: "...", user: { id, username, roleName, ... } } }
        const payload = action.payload?.data ?? action.payload ?? {};
        const { token, user } = payload;
        if (token) {
          state.token = token;
          state.user = user;
          localStorage.setItem("ehr_token", token);
          localStorage.setItem("ehr_user", JSON.stringify(user));
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
