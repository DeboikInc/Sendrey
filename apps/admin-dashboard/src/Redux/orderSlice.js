import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const getAllOrders = createAsyncThunk('orders/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/orders');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response.data);
    }
});

const orderSlice = createSlice({
    name: 'orders',
    initialState: {
        list: [],
        count: 0,
        loading: false,
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getAllOrders.pending, (state) => { state.loading = true; })
            .addCase(getAllOrders.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload.orders;  // ✅ unwrap { orders: [], count: 0 }
                state.count = action.payload.count;
            })
            .addCase(getAllOrders.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export default orderSlice.reducer;