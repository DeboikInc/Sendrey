import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getPayoutReceipts = createAsyncThunk('payout/fetchReceipts', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/payouts/receipts');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const getPayoutStats = createAsyncThunk('payout/fetchStats', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/payouts/stats');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const reviewReceipt = createAsyncThunk(`payout/review`, async ({ payoutId, receiptId, action }, { rejectWithValue }) => {
    try {
        const res = await api.patch(`/payouts/${payoutId}/receipt/${receiptId}`, { action });
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

const payoutSlice = createSlice({
    name: 'payout',
    initialState: {
        receipts: [],
        count: 0,
        stats: null,
        loading: false,
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPayoutReceipts.pending, (state) => { state.loading = true; })
            .addCase(getPayoutReceipts.fulfilled, (state, action) => {
                state.loading = false;
                state.receipts = action.payload.receipts; // ✅ unwrap { receipts: [], count: 0 }
                state.count = action.payload.count;
            })
            .addCase(getPayoutReceipts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getPayoutStats.fulfilled, (state, action) => {
                state.stats = action.payload.stats ?? action.payload;
            })
            .addCase(reviewReceipt.fulfilled, (state, action) => {
                const updated = action.payload.receipt;
                // ✅ server uses receiptId, not _id
                const index = state.receipts.findIndex(r => r.receiptId === updated.receiptId);
                if (index !== -1) state.receipts[index] = updated;
            });
    }
});

export default payoutSlice.reducer;