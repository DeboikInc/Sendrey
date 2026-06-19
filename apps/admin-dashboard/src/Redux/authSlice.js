import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

export const registerAdmin = createAsyncThunk(
  "adminAuth/register",
  async ({ email, firstName, lastName, password, role = "admin", }, thunkAPI) => {
    try {
      const response = await api.post("/auth/register-admin", {
        email, firstName, lastName, password, role: 'admin',
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Admin registration failed"
      );
    }
  }
);

export const adminLogin = createAsyncThunk(
  "adminAuth/login",
  async ({ email, password }, thunkAPI) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Admin login failed"
      );
    }
  }
);

export const adminLogout = createAsyncThunk(
  "adminAuth/logout",
  async (_, thunkAPI) => {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Admin logout failed"
      );
    }
  }
);

export const adminVerifyEmail = createAsyncThunk(
  "adminAuth/verifyEmail",
  async ({ token }, thunkAPI) => {
    try {
      const response = await api.post("/auth/verify-email", { token });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Email verification failed"
      );
    }
  }
);

export const adminResendEmailVerification = createAsyncThunk(
  "adminAuth/resendEmailVerification",
  async ({ email }, thunkAPI) => {
    try {
      const response = await api.post("/auth/resend-email-verification", { email });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to resend verification"
      );
    }
  }
);

export const adminForgotPassword = createAsyncThunk(
  "adminAuth/forgotPassword",
  async ({ email }, thunkAPI) => {
    try {
      if (!email) return thunkAPI.rejectWithValue("Email is required");
      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Something went wrong, try again later"
      );
    }
  }
);

export const adminResetPassword = createAsyncThunk(
  "adminAuth/resetPassword",
  async ({ token, newPassword }, thunkAPI) => {
    try {
      const response = await api.post("/auth/reset-password", { token, newPassword });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Something went wrong, try again later"
      );
    }
  }
);

export const adminChangePassword = createAsyncThunk(
  "adminAuth/changePassword",
  async ({ currentPassword, newPassword }, thunkAPI) => {
    try {
      const response = await api.post("/auth/change-password", { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Something went wrong, try again later"
      );
    }
  }
);

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState: {
    status: "idle",
    error: "",
    admin: null,
    token: null,
    isAuthenticated: false,
  },
  reducers: {
    logoutAdmin(state) {
      state.admin = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    updateAdmin(state, action) {
      if (state.admin) {
        state.admin = { ...state.admin, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.status = "loading"; state.error = ""; };
    const rejected = (state, action) => {
      state.status = "failed";
      state.error = action.payload || action.error?.message || "Something went wrong";
    };

    builder
      .addCase(registerAdmin.pending, pending)
      .addCase(registerAdmin.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload?.token) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
        }
        if (action.payload?.user) {
          state.admin = action.payload.user;
        }
      })
      .addCase(registerAdmin.rejected, rejected)

      .addCase(adminLogin.pending, pending)
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.admin = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(adminLogin.rejected, rejected)

      .addCase(adminLogout.pending, pending)
      .addCase(adminLogout.fulfilled, (state) => {
        state.status = "succeeded";
        state.admin = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(adminLogout.rejected, rejected)

      .addCase(adminVerifyEmail.pending, pending)
      .addCase(adminVerifyEmail.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.token) state.token = action.payload.token;
        state.admin = action.payload.user;
      })
      .addCase(adminVerifyEmail.rejected, rejected)

      .addCase(adminResendEmailVerification.pending, pending)
      .addCase(adminResendEmailVerification.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(adminResendEmailVerification.rejected, rejected)

      .addCase(adminForgotPassword.pending, pending)
      .addCase(adminForgotPassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(adminForgotPassword.rejected, rejected)

      .addCase(adminResetPassword.pending, pending)
      .addCase(adminResetPassword.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.token) state.token = action.payload.token;
      })
      .addCase(adminResetPassword.rejected, rejected)

      .addCase(adminChangePassword.pending, pending)
      .addCase(adminChangePassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(adminChangePassword.rejected, rejected);
  },
});

export const { logoutAdmin, updateAdmin } = adminAuthSlice.actions;
export const adminAuthReducer = adminAuthSlice.reducer;