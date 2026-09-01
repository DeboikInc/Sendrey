// slices/kycSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

// NIN verification 
export const verifyNIN = createAsyncThunk(
    "kyc/verify-nin",
    async (imageFile, thunkAPI) => {
        try {

            const formData = new FormData();
            formData.append('document', imageFile);

            const response = await api.post("/kyc/verify/nin", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('verifyNIN error:', error.response?.data || error.message);
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "NIN submission failed"
            );
        }
    }
);

// Driver License verification - only needs licenseNumber and document
export const verifyDriverLicense = createAsyncThunk(
    "kyc/verify-driver-license",
    async (imageFile, thunkAPI) => {
        try {

            if (!imageFile || !(imageFile instanceof File)) {
                console.error('Invalid file object:', imageFile);
                throw new Error('Invalid file provided');
            }

            const formData = new FormData();
            formData.append('document', imageFile);

            const response = await api.post("/kyc/verify/driver-license", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('verifyDriverLicense error:', error.response?.data || error.message);
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Driver License submission failed"
            );
        }
    }
);

export const verifyBikerLicense = createAsyncThunk(
    "kyc/verify-biker-license",
    async (imageFile, thunkAPI) => {
        try {
            if (!imageFile || !(imageFile instanceof File)) {
                console.error('Invalid file object:', imageFile);
                throw new Error('Invalid file provided');
            }

            const formData = new FormData();
            formData.append('document', imageFile);

            const response = await api.post("/kyc/verify/biker-license", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('verifyBikerLicense error:', error.response?.data || error.message);
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Biker's License submission failed"
            );
        }
    }
);


// Selfie verification - only needs selfie image
export const verifySelfie = createAsyncThunk(
    "kyc/verify-selfie",
    async (imageFile, thunkAPI) => {
        try {

            if (!imageFile || !(imageFile instanceof File)) {
                console.error('Invalid file object:', imageFile);
                throw new Error('Invalid file provided');
            }

            const formData = new FormData();
            formData.append('selfie', imageFile);

            const response = await api.post("/kyc/verify/selfie", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('verifySelfie error:', error.response?.data || error.message);
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Selfie submission failed"
            );
        }
    }
);

// Get verification status
export const getVerificationStatus = createAsyncThunk(
    "kyc/get-status",
    async (_, thunkAPI) => {
        try {
            const response = await api.get("/kyc/status");
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to get verification status"
            );
        }
    }
);

// Get next KYC steps
export const getNextKYCSteps = createAsyncThunk(
    "kyc/get-next-steps",
    async (_, thunkAPI) => {
        try {
            const response = await api.get("/kyc/next-steps");
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to get next KYC steps"
            );
        }
    }
);

const kycSlice = createSlice({
    name: "kyc",
    initialState: {
        status: "idle",
        error: "",
        message: "",
        verificationStatus: null,
        nextSteps: null,
        uploadProgress: 0,
    },
    reducers: {
        resetKYCState(state) {
            state.status = "idle";
            state.error = "";
            state.message = "";
            state.uploadProgress = 0;
        },
        resetKYCError(state) {
            state.error = "";
            state.status = "idle";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(verifyNIN.pending, (state) => {
                state.status = "loading";
                state.error = "";
            })
            .addCase(verifyNIN.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.message = action.payload.message;
            })
            .addCase(verifyNIN.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            .addCase(verifyDriverLicense.pending, (state) => {
                state.status = "loading";
                state.error = "";
            })
            .addCase(verifyDriverLicense.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.message = action.payload.message;
            })
            .addCase(verifyDriverLicense.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            .addCase(verifyBikerLicense.pending, (state) => {
                state.status = "loading";
                state.error = "";
            })
            .addCase(verifyBikerLicense.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.message = action.payload.message;
            })
            .addCase(verifyBikerLicense.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            .addCase(verifySelfie.pending, (state) => {
                state.status = "loading";
                state.error = "";
            })
            .addCase(verifySelfie.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.message = action.payload.message;
            })
            .addCase(verifySelfie.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })
            .addCase(getVerificationStatus.pending, (state) => {
                state.status = "loading";
            })
            .addCase(getVerificationStatus.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.verificationStatus = action.payload;
            })
            .addCase(getVerificationStatus.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })
            .addCase(getNextKYCSteps.pending, (state) => {
                state.status = "loading";
            })
            .addCase(getNextKYCSteps.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.nextSteps = action.payload;
            })
            .addCase(getNextKYCSteps.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });
    },
});

export default kycSlice.reducer;
export const { resetKYCState, resetKYCError } = kycSlice.actions;