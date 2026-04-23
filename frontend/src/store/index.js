import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import patientReducer      from './slices/patientSlice';
import clinicalReducer     from './slices/clinicalSlice';
import ordersReducer       from './slices/ordersSlice';
import medicationsReducer  from './slices/medicationsSlice';
import appointmentReducer  from './slices/appointmentSlice';
import doctorReducer       from './slices/doctorSlice';
import portalAuthReducer   from './slices/portalAuthSlice';

export const store = configureStore({
  reducer: {
    auth:         authReducer,
    patients:     patientReducer,
    clinical:     clinicalReducer,
    orders:       ordersReducer,
    medications:  medicationsReducer,
    appointments: appointmentReducer,
    doctors:      doctorReducer,
    portalAuth:   portalAuthReducer,
  },
});
