import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getBusinessAccounts = createAsyncThunk('business/accounts', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/business/accounts');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const revokeBusiness = createAsyncThunk('business/revoke', async (userId, { rejectWithValue }) => {
    try {
        const res = await api.patch(`/business/accounts/${userId}/revoke`);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

const businessSlice = createSlice({
    name: 'business',
    initialState: {
        accounts: [],
        loading: false,
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getBusinessAccounts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getBusinessAccounts.fulfilled, (state, action) => {
                state.loading = false;
                state.accounts = action.payload.accounts ?? [];
            })
            .addCase(getBusinessAccounts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to load accounts';
            })
            .addCase(revokeBusiness.fulfilled, (state, action) => {
                const id = action.meta.arg;
                state.accounts = state.accounts.filter(a => a._id !== id);
            })
            .addCase(revokeBusiness.rejected, (state, action) => {
                state.error = action.payload?.message || 'Failed to revoke account';
            });
    }
});

export default businessSlice.reducer;