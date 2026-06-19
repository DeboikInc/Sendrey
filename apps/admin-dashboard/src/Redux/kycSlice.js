import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

// ── Normalize id → _id ────────────────────────────────────
const normalize = (runner) => ({
    ...runner,
    _id: runner._id || runner.id,
});

export const getPendingKYC = createAsyncThunk(
    "kycAdmin/getPending",
    async (_, thunkAPI) => {
        try {
            const response = await api.get("/kyc/pending");
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to fetch pending KYC"
            );
        }
    }
);

export const getRunnerKYCDetails = createAsyncThunk(
    "kycAdmin/getRunnerDetails",
    async (runnerId, thunkAPI) => {
        try {
            const response = await api.get(`/kyc/runner/${runnerId}`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to fetch runner details"
            );
        }
    }
);

export const approveDocument = createAsyncThunk(
    "kycAdmin/approveDocument",
    async ({ runnerId, documentType }, thunkAPI) => {
        try {
            const response = await api.post(`/kyc/approve-document/${runnerId}`, { documentType });
            return { runnerId, documentType, ...response.data };
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to approve document"
            );
        }
    }
);

export const rejectDocument = createAsyncThunk(
    "kycAdmin/rejectDocument",
    async ({ runnerId, documentType, reason }, thunkAPI) => {
        try {
            const response = await api.post(`/kyc/reject-document/${runnerId}`, { documentType, reason });
            return { runnerId, documentType, reason, ...response.data };
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to reject document"
            );
        }
    }
);

export const approveSelfie = createAsyncThunk(
    "kycAdmin/approveSelfie",
    async ({ runnerId }, thunkAPI) => {
        try {
            const response = await api.post(`/kyc/approve-selfie/${runnerId}`, {});
            return { runnerId, ...response.data };
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to approve selfie"
            );
        }
    }
);

export const rejectSelfie = createAsyncThunk(
    "kycAdmin/rejectSelfie",
    async ({ runnerId, reason }, thunkAPI) => {
        try {
            const response = await api.post(`/kyc/reject-selfie/${runnerId}`, { reason });
            return { runnerId, reason, ...response.data };
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to reject selfie"
            );
        }
    }
);

export const getVerifiedRunners = createAsyncThunk(
    "kycAdmin/getVerifiedRunners",
    async (_, thunkAPI) => {
        try {
            const response = await api.get("/kyc/verified-runners");
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to fetch verified runners"
            );
        }
    }
);

// ── Helpers ───────────────────────────────────────────────
const updateRunner = (runners, runnerId, patch) =>
    runners.map(r => (r._id === runnerId || r.id === runnerId) ? { ...r, ...patch } : r);

// ✅ Deep-update a specific document's status inside selectedRunner.documents
const updateDocumentStatus = (selectedRunner, documentType, status) => {
    if (!selectedRunner) return selectedRunner;
    return {
        ...selectedRunner,
        documents: {
            ...selectedRunner.documents,
            [documentType]: {
                ...(selectedRunner.documents?.[documentType] || {}),
                status,
                // also update verified flag for visual feedback
                verified: status === 'approved',
            },
        },
    };
};

// ✅ Deep-update biometrics status inside selectedRunner
const updateBiometricsStatus = (selectedRunner, status) => {
    if (!selectedRunner) return selectedRunner;
    return {
        ...selectedRunner,
        biometrics: {
            ...(selectedRunner.biometrics || {}),
            status,
            selfieVerified: status === 'approved',
        },
    };
};

const kycAdminSlice = createSlice({
    name: "kycAdmin",
    initialState: {
        status:         "idle",
        error:          "",
        pendingRunners: [],
        totalPending:   0,
        verifiedRunners: [],
        selectedRunner: null,
    },
    reducers: {
        clearSelectedRunner(state) {
            state.selectedRunner = null;
        },
    },
    extraReducers: (builder) => {
        const pending  = (state) => { state.status = "loading"; state.error = ""; };
        const rejected = (state, action) => {
            state.status = "failed";
            state.error  = action.payload || action.error?.message || "Something went wrong";
        };

        builder
            // ── getPendingKYC ─────────────────────────────
            .addCase(getPendingKYC.pending, pending)
            .addCase(getPendingKYC.fulfilled, (state, action) => {
                state.status        = "succeeded";
                state.pendingRunners = (action.payload.runners ?? []).map(normalize);
                state.totalPending   = action.payload.total ?? 0;
            })
            .addCase(getPendingKYC.rejected, rejected)

            // ── getRunnerKYCDetails ───────────────────────
            .addCase(getRunnerKYCDetails.pending, pending)
            .addCase(getRunnerKYCDetails.fulfilled, (state, action) => {
                state.status = "succeeded";
                const runner = action.payload.runner ?? action.payload.data ?? action.payload;
                state.selectedRunner = normalize(runner);
            })
            .addCase(getRunnerKYCDetails.rejected, rejected)

            // ── approveDocument ───────────────────────────
            .addCase(approveDocument.pending, pending)
            .addCase(approveDocument.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { runnerId, documentType, runnerStatus } = action.payload;

                // Update list row
                state.pendingRunners = updateRunner(
                    state.pendingRunners, runnerId,
                    { runnerStatus: runnerStatus || state.selectedRunner?.runnerStatus }
                );

                // ✅ Update the nested document status so VerifCard re-renders
                if (state.selectedRunner?._id === runnerId) {
                    state.selectedRunner = updateDocumentStatus(
                        state.selectedRunner, documentType, 'approved'
                    );
                    if (runnerStatus) {
                        state.selectedRunner.runnerStatus = runnerStatus;
                    }
                }
            })
            .addCase(approveDocument.rejected, rejected)

            // ── rejectDocument ────────────────────────────
            .addCase(rejectDocument.pending, pending)
            .addCase(rejectDocument.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { runnerId, documentType, reason, runnerStatus } = action.payload;

                state.pendingRunners = updateRunner(
                    state.pendingRunners, runnerId,
                    { runnerStatus: runnerStatus || state.selectedRunner?.runnerStatus }
                );

                // ✅ Update the nested document status + store rejection reason
                if (state.selectedRunner?._id === runnerId) {
                    state.selectedRunner = {
                        ...updateDocumentStatus(state.selectedRunner, documentType, 'rejected'),
                        documents: {
                            ...state.selectedRunner.documents,
                            [documentType]: {
                                ...(state.selectedRunner.documents?.[documentType] || {}),
                                status:          'rejected',
                                verified:        false,
                                rejectionReason: reason,
                            },
                        },
                    };
                    if (runnerStatus) {
                        state.selectedRunner.runnerStatus = runnerStatus;
                    }
                }
            })
            .addCase(rejectDocument.rejected, rejected)

            // ── approveSelfie ─────────────────────────────
            .addCase(approveSelfie.pending, pending)
            .addCase(approveSelfie.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { runnerId, runnerStatus } = action.payload;

                state.pendingRunners = updateRunner(
                    state.pendingRunners, runnerId,
                    { runnerStatus: runnerStatus || state.selectedRunner?.runnerStatus }
                );

                // ✅ Update biometrics status so selfie VerifCard re-renders
                if (state.selectedRunner?._id === runnerId) {
                    state.selectedRunner = updateBiometricsStatus(state.selectedRunner, 'approved');
                    if (runnerStatus) {
                        state.selectedRunner.runnerStatus = runnerStatus;
                    }
                }
            })
            .addCase(approveSelfie.rejected, rejected)

            // ── rejectSelfie ──────────────────────────────
            .addCase(rejectSelfie.pending, pending)
            .addCase(rejectSelfie.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { runnerId, reason, runnerStatus } = action.payload;

                state.pendingRunners = updateRunner(
                    state.pendingRunners, runnerId,
                    { runnerStatus: runnerStatus || state.selectedRunner?.runnerStatus }
                );

                // ✅ Update biometrics status + store rejection reason
                if (state.selectedRunner?._id === runnerId) {
                    state.selectedRunner = {
                        ...updateBiometricsStatus(state.selectedRunner, 'rejected'),
                        biometrics: {
                            ...(state.selectedRunner.biometrics || {}),
                            status:          'rejected',
                            selfieVerified:  false,
                            rejectionReason: reason,
                        },
                    };
                    if (runnerStatus) {
                        state.selectedRunner.runnerStatus = runnerStatus;
                    }
                }
            })
            .addCase(rejectSelfie.rejected, rejected)

            // ── getVerifiedRunners ────────────────────────
            .addCase(getVerifiedRunners.pending, pending)
            .addCase(getVerifiedRunners.fulfilled, (state, action) => {
                state.status         = "succeeded";
                state.verifiedRunners = (action.payload.runners ?? []).map(normalize);
            })
            .addCase(getVerifiedRunners.rejected, rejected);
    },
});

export const kycAdminReducer = kycAdminSlice.reducer;
export const { clearSelectedRunner } = kycAdminSlice.actions;