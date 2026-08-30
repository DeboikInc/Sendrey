import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getMyReferrals = createAsyncThunk(
  'referrals/getMyReferrals',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/referrals/me');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch referrals');
    }
  }
);

const referralSlice = createSlice({
  name: 'referrals',
  initialState: {
    referrals: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearReferrals: (state) => {
      state.referrals = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getMyReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMyReferrals.fulfilled, (state, action) => {
        state.loading = false;
        state.referrals = action.payload.referrals;
      })
      .addCase(getMyReferrals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearReferrals } = referralSlice.actions;
export default referralSlice.reducer;