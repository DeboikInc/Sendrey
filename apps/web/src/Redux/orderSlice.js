import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// ─── Async thunk
export const fetchRunnerOrders = createAsyncThunk(
  'order/fetchRunnerOrders',
  async (
    { runnerId, page = 1, limit = 10, status, taskType, dateFrom, dateTo, search },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.set('status', status);
      if (taskType) params.set('taskType', taskType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await api.get(`/orders/history/runner/${runnerId}?${params.toString()}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderByChatId = createAsyncThunk(
  'order/fetchOrderByChatId',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/by-chat/${chatId}`);
      return response.data;
    } catch (err) {
      console.error('[fetchOrderByChatId] failed:', err.response?.status, err.response?.data)
      return rejectWithValue(null);
    }
  }
);

export const fetchUserOrderHistory = createAsyncThunk(
  'order/fetchUserOrderHistory',
  async ({ userId, status, taskType, search, dateFrom, dateTo, cursor, limit = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (taskType) params.set('taskType', taskType);
      if (search) params.set('search', search);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (cursor) params.set('cursor', cursor);
      params.set('limit', limit);

      const res = await api.get(`/orders/history/user/${userId}?${params.toString()}`);
      console.log('[fetchUserOrderHistory] raw res.data:', JSON.stringify(res.data, null, 2));
      return res.data;
    } catch (error) {
      console.log('[fetchUserOrderHistory] error:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order history');
    }
  }
);

export const cancelOrderByUser = createAsyncThunk(
  'order/cancelOrderByUser',
  async ({ userId, chatId, orderId, reason }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (orderId) params.set('orderId', orderId);
      if (chatId) params.set('chatId', chatId);
      if (reason) params.set('reason', reason);

      const response = await api.post(`/orders/cancel-order/${userId}?${params.toString()}`);
      return response.data;
    } catch (err) {
      console.error('[cancelOrderByUser] failed:', err.response?.status, err.response?.data)
      return rejectWithValue({
        code: err.response?.data?.code,
        message: err.response?.data?.message || 'Failed to cancel order',
      });
    }
  }
);

export const getUserCancellationReasons = createAsyncThunk(
  'order/getUserCancellationReasons',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/orders/user-cancellation-reasons');
      return response.data;
    } catch (err) {
      console.error('[cancelOrderByUser] failed:', err.response?.status, err.response?.data)
      return rejectWithValue(null);
    }
  }
);

// ─── Slice

const initialState = {
  // Current draft order being built (user side flow)
  currentOrder: null,
  editingField: null,
  isEditing: false,
  originalOrder: null,

  // Runner order history
  runnerOrders: [],
  ordersPage: 1,
  ordersHasMore: true,
  ordersLoading: false,
  ordersError: null,
  setActiveChat: null,

  userOrders: [],
  userOrdersNextCursor: null,
  userOrdersLoading: false,
  userOrdersError: null,

  cancelling: false,
  cancelError: null,
  cancelledOrder: null,

  cancellationReasons: [],
  reasonsLoading: false,
  reasonsError: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    startNewOrder: (state, action) => {
      state.currentOrder = action.payload;
      state.isEditing = false;
      state.editingField = null;
      state.originalOrder = null;
    },
    updateOrder: (state, action) => {
      state.currentOrder = { ...state.currentOrder, ...action.payload };
    },
    startEditing: (state, action) => {
      state.isEditing = true;
      state.editingField = action.payload.field;
      state.originalOrder = JSON.parse(JSON.stringify(state.currentOrder));
    },
    finishEditing: (state) => {
      state.isEditing = false;
      state.editingField = null;
      state.originalOrder = null;
    },
    cancelEditing: (state) => {
      if (state.originalOrder) state.currentOrder = state.originalOrder;
      state.isEditing = false;
      state.editingField = null;
      state.originalOrder = null;
    },
    clearOrder: (state) => {
      state.currentOrder = null;
      state.isEditing = false;
      state.editingField = null;
      state.originalOrder = null;
    },
    setActiveChat: (state, action) => {
      state.activeChatId = action.payload.chatId;
      state.activeOrderId = action.payload.orderId;
    },
    clearActiveChat: (state) => {
      state.activeChatId = null;
      state.activeOrderId = null;
    },
    resetRunnerOrders: (state) => {
      state.runnerOrders = [];
      state.ordersPage = 1;
      state.ordersHasMore = true;
      state.ordersError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRunnerOrders.pending, (state) => {
        state.ordersLoading = true;
        state.ordersError = null;
      })
      .addCase(fetchRunnerOrders.fulfilled, (state, action) => {
        state.ordersLoading = false;
        const { orders, hasMore, page } = action.payload;

        if (page === 1) {
          // Fresh load or refresh
          state.runnerOrders = orders;
        } else {
          // Append for pagination
          const existingIds = new Set(state.runnerOrders.map(o => o.orderId));
          const newOrders = orders.filter(o => !existingIds.has(o.orderId));
          state.runnerOrders = [...state.runnerOrders, ...newOrders];
        }

        state.ordersPage = page;
        state.ordersHasMore = hasMore;
      })
      .addCase(fetchRunnerOrders.rejected, (state, action) => {
        state.ordersLoading = false;
        state.ordersError = action.payload;
      })

      .addCase(fetchOrderByChatId.pending, (state) => {
        state.ordersLoading = true;
      })
      .addCase(fetchOrderByChatId.fulfilled, (state, action) => {
        state.ordersLoading = false;
        state.currentOrder = action.payload?.data ?? action.payload;
      })
      .addCase(fetchOrderByChatId.rejected, (state) => {
        state.ordersLoading = false;
        // silent — order just doesn't exist yet
      })

      .addCase(fetchUserOrderHistory.pending, (state) => {
        state.userOrdersLoading = true;
        state.userOrdersError = null;
      })

      .addCase(fetchUserOrderHistory.fulfilled, (state, action) => {
        state.userOrdersLoading = false;
        const { orders, nextCursor } = action.payload?.data ?? action.payload;

        if (action.meta.arg?.cursor) {
          const existingIds = new Set(state.userOrders.map((o) => o.orderId));
          state.userOrders = [...state.userOrders, ...orders.filter((o) => !existingIds.has(o.orderId))];
        } else {
          state.userOrders = orders;
        }
        state.userOrdersNextCursor = nextCursor;
      })

      .addCase(fetchUserOrderHistory.rejected, (state, action) => {
        state.userOrdersLoading = false;
        state.userOrdersError = action.payload;
      })

      .addCase(cancelOrderByUser.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(cancelOrderByUser.fulfilled, (state, action) => {
        state.cancelling = false;
        const { order } = action.payload?.data ?? action.payload;
        state.cancelledOrder = order;

        // reflect cancellation in userOrders list if present
        const idx = state.userOrders.findIndex((o) => o.orderId === order.orderId);
        if (idx !== -1) state.userOrders[idx].status = 'cancelled';

        if (state.currentOrder?.orderId === order.orderId) {
          state.currentOrder.status = 'cancelled';
        }
      })
      .addCase(cancelOrderByUser.rejected, (state, action) => {
        state.cancelling = false;
        state.cancelError = action.payload?.message || 'Failed to cancel order';
      })

      .addCase(getUserCancellationReasons.pending, (state) => {
        state.reasonsLoading = true;
        state.reasonsError = null;
      })
      .addCase(getUserCancellationReasons.fulfilled, (state, action) => {
        state.reasonsLoading = false;
        state.cancellationReasons = action.payload?.data ?? action.payload;
      })
      .addCase(getUserCancellationReasons.rejected, (state, action) => {
        state.reasonsLoading = false;
        state.reasonsError = action.payload;
      })
  },
});

export const {
  startNewOrder,
  updateOrder,
  startEditing,
  finishEditing,
  cancelEditing,
  clearOrder,
  resetRunnerOrders,
  setActiveChat, clearActiveChat,
} = orderSlice.actions;

export default orderSlice.reducer;