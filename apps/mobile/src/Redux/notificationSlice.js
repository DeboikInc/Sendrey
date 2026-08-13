// slices/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

const basePath = (userType) => (userType === 'runner' ? 'runners' : 'users');

export const optInNotifications = createAsyncThunk(
  'notification/optIn',
  async ({ userId, userType = 'user' }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/notifications/${basePath(userType)}/opt-in/${userId}`,
        { userType }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to opt in');
    }
  }
);

export const optOutNotifications = createAsyncThunk(
  'notification/optOut',
  async ({ userId, userType = 'user' }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/notifications/${basePath(userType)}/opt-out/${userId}`,
        { userType }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to opt out');
    }
  }
);

export const getNotificationPreferences = createAsyncThunk(
  'notification/getPreferences',
  async ({ userId, userType = 'user' }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/notifications/${basePath(userType)}/preferences/${userId}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get preferences');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    preferences: null,
    status: 'idle',
    loading: false,
    error: null
  },
  reducers: {
    clearNotificationStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Opt In
      .addCase(optInNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(optInNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload?.notificationPreferences;
        state.status = 'opted_in';
      })
      .addCase(optInNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Opt Out
      .addCase(optOutNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(optOutNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload?.notificationPreferences;
        state.status = 'opted_out';
      })
      .addCase(optOutNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Preferences
      .addCase(getNotificationPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload?.notificationPreferences;
      })
      .addCase(getNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearNotificationStatus } = notificationSlice.actions;
export default notificationSlice.reducer;