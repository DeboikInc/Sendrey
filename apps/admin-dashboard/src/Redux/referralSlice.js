import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getAllReferrals = createAsyncThunk(
  'adminReferrals/getAllReferrals',
  async ({ status, page, limit } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/referrals/get-all-referrals', {
        params: { status, page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch referrals');
    }
  }
);

export const getReferralConfig = createAsyncThunk(
  'adminReferrals/getReferralConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/referrals/get-referrals-config');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch referral config');
    }
  }
);

export const updateReferralConfig = createAsyncThunk(
  'adminReferrals/updateReferralConfig',
  async (bonusAmount, { rejectWithValue }) => {
    try {
      const response = await api.patch('/referrals/update-referrals-config', { bonusAmount });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update referral config');
    }
  }
);

const adminReferralSlice = createSlice({
  name: 'adminReferrals',
  initialState: {
    referrals: [],
    total: 0,
    page: 1,
    limit: 20,
    config: null,
    loading: false,
    configLoading: false,
    updating: false,
    error: null,
  },
  reducers: {
    clearAdminReferrals: (state) => {
      state.referrals = [];
      state.total = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getAllReferrals
      .addCase(getAllReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllReferrals.fulfilled, (state, action) => {
        state.loading = false;
        state.referrals = action.payload.referrals;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(getAllReferrals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // getReferralConfig
      .addCase(getReferralConfig.pending, (state) => {
        state.configLoading = true;
        state.error = null;
      })
      .addCase(getReferralConfig.fulfilled, (state, action) => {
        state.configLoading = false;
        state.config = action.payload.config;
      })
      .addCase(getReferralConfig.rejected, (state, action) => {
        state.configLoading = false;
        state.error = action.payload;
      })

      // updateReferralConfig
      .addCase(updateReferralConfig.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateReferralConfig.fulfilled, (state, action) => {
        state.updating = false;
        state.config = action.payload.config;
      })
      .addCase(updateReferralConfig.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      });
  },
});

export const { clearAdminReferrals } = adminReferralSlice.actions;
export default adminReferralSlice.reducer;