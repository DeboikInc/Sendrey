import { configureStore } from '@reduxjs/toolkit';
import { injectStore } from '../utils/api'; 
import { adminAuthReducer } from '../Redux/authSlice';
import { kycAdminReducer } from '../Redux/kycSlice';
import runnersReducer from '../Redux/runnersSlice';
import usersReducer from '../Redux/usersSlice';
import businessReducer from '../Redux/businessSlice';
import disputeReducer from '../Redux/disputeSlice';
import orderReducer from '../Redux/orderSlice';
import payoutReducer from '../Redux/payoutSlice';
import escrowReducer from '../Redux/escrowSlice';
const store = configureStore({
  reducer: {
    auth: adminAuthReducer,
    adminKyc: kycAdminReducer,
    runners: runnersReducer,
    users: usersReducer,
    business: businessReducer,
    dispute: disputeReducer,
    orders: orderReducer,
    payouts: payoutReducer,
    escrow: escrowReducer,
  },
});

injectStore(store);

export default store;