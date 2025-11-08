import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// import userReducer from './slices/userSlice';
// import chatReducer from './slices/chatSlice';
// import trainingReducer from './slices/trainingSlice';
// import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // user: userReducer,
    // chat: chatReducer,
    // training: trainingReducer,
    // ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
