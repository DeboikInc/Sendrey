import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const raiseDispute = createAsyncThunk(
  'dispute/raise',
  async (disputeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/disputes/raise', disputeData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to raise dispute');
    }
  }
);

export const getDispute = createAsyncThunk(
  'dispute/get',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/disputes/get-disputes/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get dispute');
    }
  }
);

export const getRunnerDisputes = createAsyncThunk(
  'dispute/getRunnerDisputes',
  async (runnerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/disputes/get-runner-disputes/${runnerId}`);
      return response.data?.disputes || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const getUserDisputes = createAsyncThunk(
  'dispute/getUserDisputes',
  async (userId, { rejectWithValue }) => {
    try {

      const response = await api.get(`/disputes/get-user-disputes/${userId}`);
      return response.data?.disputes || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

const toTitleCase = (s) =>
  String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeCategories = (raw) => {
  const list = Array.isArray(raw?.categories)
    ? raw.categories
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];

  return list.map((item) =>
    typeof item === 'string'
      ? { value: item, label: toTitleCase(item) }
      : { value: item.value ?? item.category, label: item.label ?? toTitleCase(item.value ?? item.category) }
  );
};


export const getUserDisputeCategories = createAsyncThunk(
  'dispute/getUserDisputeCategories',
  async (userId, { rejectWithValue }) => {
    try {

      const response = await api.get(`/disputes/order/get-user-dispute-categories`);
      return normalizeCategories(response.data || response.data?.disputes);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const getRunnerDisputeCategories = createAsyncThunk(
  'dispute/getRunnerDisputeCategories',
  async (userId, { rejectWithValue }) => {
    try {

      const response = await api.get(`/disputes/order/get-runner-dispute-categories`);
      return normalizeCategories(response.data || response.data?.disputes);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const getRunnerDisputableOrders = createAsyncThunk(
  'dispute/getRunnerDisputableOrders',
  async (runnerId, { rejectWithValue }) => {
    try {
      const response = await api.get('/disputes/order/get-runner-disputable-orders');
      const list = response.data?.data?.orders ?? response.data?.orders ?? [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputable orders');
    }
  }
);

export const getUserDisputableOrders = createAsyncThunk(
  'dispute/getUserDisputableOrders',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get('/disputes/order/get-user-disputable-orders');
      const list = response.data?.data?.orders ?? response.data?.orders ?? [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputable orders');
    }
  }
);

const disputeSlice = createSlice({
  name: 'dispute',
  initialState: {
    currentDispute: null,
    disputes: [],
    disputableOrders: [],
    disputableOrdersLoading: false,
    status: 'idle',
    loading: false,
    error: null
  },
  reducers: {
    clearDispute: (state) => {
      state.currentDispute = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(raiseDispute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(raiseDispute.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispute = action.payload.data;
        state.status = 'raised';
      })
      .addCase(raiseDispute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // get disputes
      .addCase(getDispute.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDispute.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispute = action.payload.data;
      })
      .addCase(getDispute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // get runner disputes
      .addCase(getRunnerDisputes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRunnerDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload;
      })
      .addCase(getRunnerDisputes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getUserDisputes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload;
      })
      .addCase(getUserDisputes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // getUserDisputeCategories
      .addCase(getUserDisputeCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.error = null;
      })
      .addCase(getUserDisputeCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(getUserDisputeCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.error = action.payload;
      })

      // getRunnerDisputeCategories
      .addCase(getRunnerDisputeCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.error = null;
      })
      .addCase(getRunnerDisputeCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(getRunnerDisputeCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.error = action.payload;
      })

      // getRunnerDisputableOrders
      .addCase(getRunnerDisputableOrders.pending, (state) => {
        state.disputableOrdersLoading = true;
        state.error = null;
      })
      .addCase(getRunnerDisputableOrders.fulfilled, (state, action) => {
        state.disputableOrdersLoading = false;
        state.disputableOrders = action.payload;
      })
      .addCase(getRunnerDisputableOrders.rejected, (state, action) => {
        state.disputableOrdersLoading = false;
        state.error = action.payload;
      })

      // getUserDisputableOrders
      .addCase(getUserDisputableOrders.pending, (state) => {
        state.disputableOrdersLoading = true;
        state.error = null;
      })
      .addCase(getUserDisputableOrders.fulfilled, (state, action) => {
        state.disputableOrdersLoading = false;
        state.disputableOrders = action.payload;
      })
      .addCase(getUserDisputableOrders.rejected, (state, action) => {
        state.disputableOrdersLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearDispute } = disputeSlice.actions;
export default disputeSlice.reducer;