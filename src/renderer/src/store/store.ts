// src/renderer/src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import settingsReducer from "./slices/settingsSlice";
import deviceReducer from "./slices/deviceSlice";
import scenesReducer from "./slices/sceneSlice";
// Import other reducers here

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    devices: deviceReducer,
    scenes: scenesReducer,
    // Add other reducers here
  },
  // Middleware can be added here if needed (e.g., for logging, thunks for async actions)
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {settings: SettingsState, devices: DeviceState, ...}
export type AppDispatch = typeof store.dispatch;
