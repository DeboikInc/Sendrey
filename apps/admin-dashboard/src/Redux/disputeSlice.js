import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getAllDisputes = createAsyncThunk('dispute/list', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/disputes');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response.data);
    }
});

export const getDispute = createAsyncThunk('dispute/getOne', async (orderId, { rejectWithValue }) => {
    try {
        const response = await api.get(`/disputes/${orderId}`);
        return response.data;
    } catch (err) {
        return rejectWithValue(
            err.response?.data?.message || err.message || 'Failed to get disputes'
        );
    }
});

export const resolveDispute = createAsyncThunk('dispute/resolve', async ({ disputeId, resolutionData }, { rejectWithValue }) => {
    try {
        const response = await api.patch(`/disputes/${disputeId}/resolve`, resolutionData);
        console.log('[resolveDispute] raw response.data:', response.data);
        return response.data;
    } catch (err) {
        return rejectWithValue(
            err.response?.data?.message || err.message || 'Failed to resolve dispute'
        );
    }
});

const disputeSlice = createSlice({
    name: 'dispute',
    initialState: {
        list: [],
        count: 0,
        selectedDispute: null,
        currentDispute: null,
        loading: false,
        resolveStatus: 'idle',
        error: null,
    },
    reducers: {
        setSelectedDispute(state, action) { state.selectedDispute = action.payload; },
        clearSelectedDispute(state) { state.selectedDispute = null; },
        clearResolveStatus(state) { state.resolveStatus = 'idle'; state.resolveError = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getAllDisputes.pending, (state) => { state.loading = true; })
            .addCase(getAllDisputes.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload.disputes ?? [];
                console.log('first dispute:', state.list[0]?.userId, state.list[0]?.runnerId);
                state.count = action.payload.pagination?.total ?? 0;
            })
            .addCase(getAllDisputes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getDispute.fulfilled, (state, action) => {
                state.currentDispute = action.payload.dispute;
            })
            .addCase(resolveDispute.fulfilled, (state, action) => {
                state.resolveStatus = 'succeeded';
                const updated = action.payload.dispute;
                const idx = state.list.findIndex(d => d._id === updated._id);
                if (idx !== -1) {
                    // merge — keep existing populated fields, only update status/resolution
                    state.list[idx] = { ...state.list[idx], ...updated };
                }
                if (state.selectedDispute?._id === updated._id) {
                    state.selectedDispute = { ...state.selectedDispute, ...updated };
                }
            })
            .addCase(resolveDispute.rejected, (state, action) => {
                state.resolveStatus = 'failed';
                state.resolveError = typeof action.payload === 'string'
                    ? action.payload
                    : action.payload?.message || 'Failed to resolve dispute';
            })
    }
});

export const {
    setSelectedDispute,
    clearSelectedDispute,
    clearResolveStatus,
} = disputeSlice.actions;

export default disputeSlice.reducer;