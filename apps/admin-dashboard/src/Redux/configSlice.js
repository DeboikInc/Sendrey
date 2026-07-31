// Redux/configSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// Pricing config
export const fetchPricingConfig = createAsyncThunk('config/fetchPricing', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/pricing/get-pricing-config');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to load pricing config');
    }
});

export const savePricingConfig = createAsyncThunk('config/savePricing', async (config, { rejectWithValue }) => {
    try {
        const res = await api.put('/pricing/update-pricing-config', config);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to save pricing config');
    }
});

// Matching (distance) config
export const fetchMatchingConfig = createAsyncThunk('config/fetchMatching', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/distance/get-matching-config');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to load matching config');
    }
});

export const saveMatchingConfig = createAsyncThunk('config/saveMatching', async (config, { rejectWithValue }) => {
    try {
        const res = await api.put('/distance/put-matching-config', config);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to save matching config');
    }
});

// Platform settlement bank account
export const fetchPlatformConfig = createAsyncThunk('config/fetchPlatform', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/platform/get-platform-fee-setting');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to load platform settings');
    }
});

export const savePlatformConfig = createAsyncThunk('config/savePlatform', async (config, { rejectWithValue }) => {
    try {
        const res = await api.put('/platform/update-platform-fee-bank-account', config);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to save platform bank account');
    }
});

// Pedestrian config
export const fetchPedestrianConfig = createAsyncThunk(
    'config/fetchPedestrian',
    async (_, { rejectWithValue }) => {
        try {
            console.log('Fetching pedestrian config...');
            const res = await api.get('/distance/get-pedestrian-config');
            console.log('Pedestrian config response:', res.data);
            console.log('Response status:', res.status);
            console.log('Response data keys:', Object.keys(res.data));
            return res.data.data || res.data;
        } catch (err) {
            console.error('Error fetching pedestrian config:', err);
            return rejectWithValue(err.response?.data?.message || 'Failed to load pedestrian config');
        }
    }
);

export const savePedestrianConfig = createAsyncThunk('config/savePedestrian', async (config, { rejectWithValue }) => {
    try {
        const res = await api.put('/distance/update-pedestrian-config', config);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to save pedestrian config');
    }
});

const resourceInitial = { data: null, original: null, loading: false, saving: false, error: null };

const initialState = {
    pricing: { ...resourceInitial },
    matching: { ...resourceInitial },
    platform: { ...resourceInitial },
    pedestrian: { ...resourceInitial },
};

const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        updateField(state, action) {
            const { resource, field, value } = action.payload;
            state[resource].data[field] = value;
        },

        updatePedestrianLeg(state, action) {
            const { field, value } = action.payload;
            // set the value directly without clamping
            state.pedestrian.data[field] = value;

            // Recalculate total
            const runnerLeg = Number(state.pedestrian.data.pedestrianMaxRunnerLeg) || 0;
            const deliveryLeg = Number(state.pedestrian.data.pedestrianMaxDeliveryLeg) || 0;
            state.pedestrian.data.pedestrianTotalMax = runnerLeg + deliveryLeg;
        },
        updateFleetRule(state, action) {
            const { fleetKey, field, value } = action.payload;
            state.pricing.data.fleetRules[fleetKey][field] = value;
        },
        updateTier(state, action) {
            const { index, field, value } = action.payload;
            state.pricing.data.pedestrianTiers[index][field] = value;
        },
        addTier(state) {
            state.pricing.data.pedestrianTiers.push({ maxDistanceMeters: 0, fee: 0 });
        },
        removeTier(state, action) {
            state.pricing.data.pedestrianTiers.splice(action.payload, 1);
        },
        discardChanges(state, action) {
            const { resource } = action.payload;
            state[resource].data = state[resource].original;
        },
    },
    extraReducers: (builder) => {
        builder
            // pricing
            .addCase(fetchPricingConfig.pending, (state) => {
                state.pricing.loading = true;
                state.pricing.error = null;
            })
            .addCase(fetchPricingConfig.fulfilled, (state, action) => {
                state.pricing.loading = false;
                state.pricing.data = action.payload;
                state.pricing.original = action.payload;
            })
            .addCase(fetchPricingConfig.rejected, (state, action) => {
                state.pricing.loading = false;
                state.pricing.error = action.payload;
            })
            .addCase(savePricingConfig.pending, (state) => {
                state.pricing.saving = true;
                state.pricing.error = null;
            })
            .addCase(savePricingConfig.fulfilled, (state, action) => {
                state.pricing.saving = false;
                state.pricing.data = action.payload;
                state.pricing.original = action.payload;
            })
            .addCase(savePricingConfig.rejected, (state, action) => {
                state.pricing.saving = false;
                state.pricing.error = action.payload;
            })

            // matching
            .addCase(fetchMatchingConfig.pending, (state) => {
                state.matching.error = null;
            })
            .addCase(fetchMatchingConfig.fulfilled, (state, action) => {
                state.matching.data = action.payload;
                state.matching.original = action.payload;
            })
            .addCase(fetchMatchingConfig.rejected, (state, action) => {
                state.matching.error = action.payload;
            })
            .addCase(saveMatchingConfig.pending, (state) => {
                state.matching.saving = true;
                state.matching.error = null;
            })
            .addCase(saveMatchingConfig.fulfilled, (state, action) => {
                state.matching.saving = false;
                state.matching.data = action.payload;
                state.matching.original = action.payload;
            })
            .addCase(saveMatchingConfig.rejected, (state, action) => {
                state.matching.saving = false;
                state.matching.error = action.payload;
            })

            // platform
            .addCase(fetchPlatformConfig.pending, (state) => {
                state.platform.error = null;
            })
            .addCase(fetchPlatformConfig.fulfilled, (state, action) => {
                state.platform.data = action.payload;
                state.platform.original = action.payload;
            })
            .addCase(fetchPlatformConfig.rejected, (state, action) => {
                state.platform.error = action.payload;
            })
            .addCase(savePlatformConfig.pending, (state) => {
                state.platform.saving = true;
                state.platform.error = null;
            })
            .addCase(savePlatformConfig.fulfilled, (state, action) => {
                state.platform.saving = false;
                state.platform.data = action.payload;
                state.platform.original = action.payload;
            })
            .addCase(savePlatformConfig.rejected, (state, action) => {
                state.platform.saving = false;
                state.platform.error = action.payload;
            })

            // pedestrian
            .addCase(fetchPedestrianConfig.pending, (state) => {
                state.pedestrian.error = null;
            })
            .addCase(fetchPedestrianConfig.fulfilled, (state, action) => {
                state.pedestrian.data = action.payload;
                state.pedestrian.original = action.payload;
            })
            .addCase(fetchPedestrianConfig.rejected, (state, action) => {
                state.pedestrian.error = action.payload;
            })
            .addCase(savePedestrianConfig.pending, (state) => {
                state.pedestrian.saving = true;
                state.pedestrian.error = null;
            })
            .addCase(savePedestrianConfig.fulfilled, (state, action) => {
                state.pedestrian.saving = false;
                state.pedestrian.data = action.payload;
                state.pedestrian.original = action.payload;
            })
            .addCase(savePedestrianConfig.rejected, (state, action) => {
                state.pedestrian.saving = false;
                state.pedestrian.error = action.payload;
            });
    },
});

export const {
    updateField,
    updatePedestrianLeg,
    updateFleetRule,
    updateTier,
    addTier,
    removeTier,
    discardChanges,
} = configSlice.actions;
export default configSlice.reducer;