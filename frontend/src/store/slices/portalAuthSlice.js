import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { portalAuthService } from "../../api/portal.service";

const PORTAL_TOKEN_KEY = "portal_token";
const PORTAL_USER_KEY  = "portal_user";

const initialState = {
    portalUser: JSON.parse(localStorage.getItem(PORTAL_USER_KEY)) || null,
    token:      localStorage.getItem(PORTAL_TOKEN_KEY) || null,
    loading:    false,
    error:      null,
};

// ── Login ──────────────────────────────────────────────────────────────────
export const loginPortalUser = createAsyncThunk(
    "portalAuth/login",
    async (credentials, thunkAPI) => {
        try {
            const res = await portalAuthService.login(credentials);
            return res;
        } catch (err) {
            const message = err.response?.data?.message || err.message || "Login failed";
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Register ─────────────────────────────────────────────────────────────
export const registerPortalUser = createAsyncThunk(
    "portalAuth/register",
    async (data, thunkAPI) => {
        try {
            const res = await portalAuthService.register(data);
            return res;
        } catch (err) {
            const message = err.response?.data?.message || err.message || "Registration failed";
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const portalAuthSlice = createSlice({
    name: "portalAuth",
    initialState,
    reducers: {
        logoutPortal: (state) => {
            state.portalUser = null;
            state.token      = null;
            localStorage.removeItem(PORTAL_TOKEN_KEY);
            localStorage.removeItem(PORTAL_USER_KEY);
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginPortalUser.pending, (state) => {
                state.loading = true;
                state.error   = null;
            })
            .addCase(loginPortalUser.fulfilled, (state, action) => {
                state.loading = false;
                const payload = action.payload?.data ?? action.payload ?? {};
                const { token, patientName, patientId, portalUserId, email } = payload;
                if (token) {
                    state.token      = token;
                    state.portalUser = { portalUserId, patientId, patientName, email };
                    localStorage.setItem(PORTAL_TOKEN_KEY, token);
                    localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(state.portalUser));
                }
            })
            .addCase(loginPortalUser.rejected, (state, action) => {
                state.loading = false;
                state.error   = action.payload;
            })
            // Register (no auto-login, just returns success)
            .addCase(registerPortalUser.pending, (state) => {
                state.loading = true;
                state.error   = null;
            })
            .addCase(registerPortalUser.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(registerPortalUser.rejected, (state, action) => {
                state.loading = false;
                state.error   = action.payload;
            });
    },
});

export const { logoutPortal } = portalAuthSlice.actions;
export default portalAuthSlice.reducer;
