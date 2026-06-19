import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const listUsers = createAsyncThunk('users/list', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/users');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const updateUserStatus = createAsyncThunk('users/updateStatus', async ({ userId, isActive }, { rejectWithValue }) => {
    try {
        const response = await api.patch(`/users/${userId}/status`, { isActive });
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const bulkUserAction = createAsyncThunk('users/bulkAction', async ({ userIds, action }, { rejectWithValue }) => {
    try {
        const response = await api.post('/users/bulk/action', { userIds, action });
        return { userIds, action, data: response.data };
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

export const deleteUser = createAsyncThunk('users/delete', async (userId, { rejectWithValue }) => {
    try {
        await api.delete(`/users/${userId}`);
        return userId;
    } catch (err) {
        return rejectWithValue(err.response?.data);
    }
});

const usersSlice = createSlice({
    name: 'users',
    initialState: {
        list: [],
        count: 0,
        loading: false,
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(listUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(listUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload.users ?? [];
                state.count = action.payload.pagination?.total ?? state.list.length;
            })
            .addCase(listUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to load users';
            })
            .addCase(updateUserStatus.fulfilled, (state, action) => {
                const updated = action.payload.user;
                const index = state.list.findIndex(u => u._id === updated._id);
                if (index !== -1) state.list[index] = { ...state.list[index], ...updated };
            })
            .addCase(updateUserStatus.rejected, (state, action) => {
                state.error = action.payload?.message || 'Failed to update status';
            })
            .addCase(bulkUserAction.fulfilled, (state, action) => {
                const { userIds, action: act } = action.payload;
                if (act === 'delete') {
                    state.list = state.list.filter(u => !userIds.includes(u._id));
                } else if (act === 'suspend') {
                    state.list = state.list.map(u =>
                        userIds.includes(u._id) ? { ...u, isActive: false } : u
                    );
                }
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.list = state.list.filter(u => u._id !== action.payload);
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.error = action.payload?.message || 'Failed to delete user';
            });
    }
});

export default usersSlice.reducer;