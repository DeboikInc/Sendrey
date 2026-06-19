// Redux/escrowSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// GET /admin/escrows/cancelled
export const getCancelledEscrows = createAsyncThunk(
    'escrow/getCancelled',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/escrows/cancelled');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch cancelled escrows');
        }
    }
);

// GET /admin/escrows/:escrowId
export const getEscrowDetails = createAsyncThunk(
    'escrow/getDetails',
    async (escrowId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/escrows/${escrowId}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch escrow details');
        }
    }
);

// POST /admin/escrows/:escrowId/refund
export const refundToWallet = createAsyncThunk(
    'escrow/refund',
    async ({ escrowId, reason }, { rejectWithValue }) => {
        try {
            const res = await api.post(`/escrows/${escrowId}/refund`, { reason });
            return { escrowId, ...res.data };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to process refund');
        }
    }
);

const escrowSlice = createSlice({
    name: 'escrow',
    initialState: {
        list: [],
        refunded: [],
        total: 0,
        selectedEscrow: null,
        status:  'idle',
        error: null,
        refundStatus: 'idle',
        refundError: null,
    },
    reducers: {
        clearSelectedEscrow(state) { state.selectedEscrow = null; },
        clearRefundStatus(state)   { state.refundStatus = 'idle'; state.refundError = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getCancelledEscrows.pending, (state) => {
                state.status = 'loading';
                state.error  = null;
            })
            .addCase(getCancelledEscrows.fulfilled, (state, action) => {
                state.status   = 'succeeded';
                state.list     = action.payload.escrows  ?? [];
                state.refunded = action.payload.refunded ?? [];
                state.total    = action.payload.total    ?? 0;
            })
            .addCase(getCancelledEscrows.rejected, (state, action) => {
                state.status = 'failed';
                state.error  = action.payload;
            })

            .addCase(getEscrowDetails.pending,   (state) => { state.status = 'loading'; })
            .addCase(getEscrowDetails.fulfilled, (state, action) => {
                state.status         = 'succeeded';
                state.selectedEscrow = action.payload.escrow ?? action.payload;
            })
            .addCase(getEscrowDetails.rejected,  (state, action) => {
                state.status = 'failed';
                state.error  = action.payload;
            })

            .addCase(refundToWallet.pending, (state) => {
                state.refundStatus = 'loading';
                state.refundError  = null;
            })
            .addCase(refundToWallet.fulfilled, (state, action) => {
                state.refundStatus = 'succeeded';
                const { escrowId } = action.payload;
                // ✅ Move from pending list → refunded list instantly
                const idx = state.list.findIndex(e => e._id === escrowId);
                if (idx !== -1) {
                    const done = { ...state.list[idx], status: 'refunded' };
                    state.list.splice(idx, 1);
                    state.refunded.unshift(done);
                    state.total = Math.max(0, state.total - 1);
                }
                if (state.selectedEscrow?._id === escrowId) {
                    state.selectedEscrow = { ...state.selectedEscrow, status: 'refunded' };
                }
            })
            .addCase(refundToWallet.rejected, (state, action) => {
                state.refundStatus = 'failed';
                state.refundError  = action.payload;
            });
    },
});

export const { clearSelectedEscrow, clearRefundStatus } = escrowSlice.actions;
export default escrowSlice.reducer;