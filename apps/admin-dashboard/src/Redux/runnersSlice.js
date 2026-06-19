import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getRunners = createAsyncThunk('runners/getRunners', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/runners?limit=500');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const getRunnerStats = createAsyncThunk('runners/getStats', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/runners/stats');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response.data);
    }
});

export const searchRunners = createAsyncThunk('runners/search', async (query, { rejectWithValue }) => {
    try {
        const response = await api.get(`/runners/search?q=${query}`);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const updateRunnerStatus = createAsyncThunk(
    'runners/updateStatus',
    async ({ runnerId, status }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/runners/${runnerId}/status`, { status });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data);
        }
    }
);

export const deleteRunner = createAsyncThunk('runners/delete', async (runnerId, { rejectWithValue }) => {
    try {
        await api.delete(`/runners/${runnerId}`);
        return runnerId;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const banRunner = createAsyncThunk('runners/ban', async (runnerId, { rejectWithValue, getState }) => {
    try {
        const runner = getState().runners.list.find(r => r._id === runnerId);
        const previousStatus = runner?.runnerStatus || 'approved_limited';
        const response = await api.patch(`/runners/${runnerId}/status`, {
            status: 'banned',
            previousStatus,
            isActive: false,
        });
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const unbanRunner = createAsyncThunk('runners/unban', async (runnerId, { rejectWithValue, getState }) => {
    try {
        const runner = getState().runners.list.find(r => r._id === runnerId);
        const restoreStatus = runner?.previousStatus || 'approved_limited';
        const response = await api.patch(`/runners/${runnerId}/status`, {
            status: restoreStatus,
            previousStatus: null,
            isActive: true,
        });
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const resetStrikeCount = createAsyncThunk('runners/resetStrikes', async (runnerId, { rejectWithValue }) => {
    try {
        const response = await api.patch(`/runners/${runnerId}/reset-strikes`);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

const runnersSlice = createSlice({
    name: 'runners',
    initialState: {
        list: [],
        count: 0,
        stats: {
            total: 0,
            active: 0,
            suspended: 0
        },
        loading: false,
        error: null,
    },
    reducers: {
        clearRunnersError: (state) => { state.error = null; }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getRunners.pending, (state) => { state.loading = true; })
            .addCase(getRunners.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload.runners ?? [];
                state.count = action.payload.pagination?.total ?? action.payload.count ?? 0;
            })
            .addCase(getRunners.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to load runners';
            })
            .addCase(searchRunners.fulfilled, (state, action) => {
                state.list = action.payload.runners;
            })
            .addCase(getRunnerStats.fulfilled, (state, action) => {
                state.stats = action.payload.stats ?? action.payload;
            })
            .addCase(updateRunnerStatus.fulfilled, (state, action) => {
                const updated = action.payload.runner;
                const index = state.list.findIndex(r => r._id === updated._id);
                if (index !== -1) state.list[index] = updated;
            })
            .addCase(deleteRunner.fulfilled, (state, action) => {
                state.list = state.list.filter(r => r._id !== action.payload);
            })

            .addCase(banRunner.fulfilled, (state, action) => {
                const updated = action.payload.runner;
                const index = state.list.findIndex(r => r._id === updated._id);
                if (index !== -1) state.list[index] = updated;
            })
            .addCase(unbanRunner.fulfilled, (state, action) => {
                const updated = action.payload.runner;
                const index = state.list.findIndex(r => r._id === updated._id);
                if (index !== -1) state.list[index] = updated;
            })
            .addCase(resetStrikeCount.fulfilled, (state, action) => {
                const updated = action.payload.runner;
                const index = state.list.findIndex(r => r._id === updated._id);
                if (index !== -1) state.list[index] = updated;
            });
    }
});

export const { clearRunnersError } = runnersSlice.actions;
export default runnersSlice.reducer;