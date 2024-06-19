// src/renderer/src/store/slices/settingsSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { switchBotApi } from "../../../../api/apiClient"; // Adjust path as needed

export interface SettingsState {
  apiToken: string | null;
  apiSecret: string | null;
  isTokenValidated: boolean;
  validationMessage: string | null; // For success/error messages during validation
  pollingIntervalSeconds: number;
  theme: "light" | "dark" | "system";
  logRetentionDays: number;
  language: "en" | "ja";
}

const initialState: SettingsState = {
  apiToken: null,
  apiSecret: null,
  isTokenValidated: false,
  validationMessage: null,
  pollingIntervalSeconds: 60,
  theme: "system",
  logRetentionDays: 7,
   language: "en",
};

// Thunk to load credentials from electron-store
export const loadApiCredentials = createAsyncThunk(
  "settings/loadApiCredentials",
  async (_, { dispatch }) => {
    try {
      const token = await window.electronStore.get("apiToken");
      const secret = await window.electronStore.get("apiSecret");
      const storedPollingInterval = await window.electronStore.get("pollingIntervalSeconds");
      const storedTheme = await window.electronStore.get("theme");
      const storedLanguage = await window.electronStore.get("language");

      if (typeof storedPollingInterval === "number" && !Number.isNaN(storedPollingInterval)) {
        dispatch(setPollingInterval(storedPollingInterval));
      }
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        dispatch(setTheme(storedTheme));
      }
      if (storedLanguage === "en" || storedLanguage === "ja") {
        dispatch(setLanguage(storedLanguage));
      }

      if (token && secret) {
        dispatch(setApiCredentials({ token, secret }));
        return { token, secret };
      }
      return null;
    } catch (error: any) {
      console.error("Failed to load API credentials from store:", error);
      throw error;
    }
  }
);

// Thunk to save credentials to electron-store and then update state
export const saveApiCredentials = createAsyncThunk(
  "settings/saveApiCredentials",
  async (payload: { token: string; secret: string }, { dispatch }) => {
    try {
      await window.electronStore.set("apiToken", payload.token);
      await window.electronStore.set("apiSecret", payload.secret);
      dispatch(setApiCredentials(payload));
      // Reset validation status and message
      dispatch(setTokenValidated(false));
      dispatch(setValidationMessage("Credentials saved. Please test them."));
      return payload;
    } catch (error: any) {
      console.error("Failed to save API credentials:", error);
      dispatch(setValidationMessage(`Error saving credentials: ${error.message}`));
      throw error;
    }
  }
);

// Thunk to test API credentials that are already stored in state/store
export const testApiCredentials = createAsyncThunk(
  "settings/testApiCredentials",
  async (_, { getState, dispatch }) => {
    const { settings } = getState() as RootState;
    if (!settings.apiToken || !settings.apiSecret) {
      dispatch(setTokenValidated(false));
      dispatch(setValidationMessage("API Token and Secret are not set."));
      return { success: false, message: "API Token and Secret are not set." };
    }

    dispatch(setValidationMessage("Testing credentials..."));
    switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);

    try {
      // Attempt to fetch devices as a test
      await switchBotApi.getDevices(); // This will throw if auth fails
      dispatch(setTokenValidated(true));
      dispatch(setValidationMessage("Credentials validated successfully!"));
      return { success: true, message: "Credentials validated successfully!" };
    } catch (error: any) {
      console.error("API credential test failed:", error);
      dispatch(setTokenValidated(false));
      dispatch(setValidationMessage(`Validation failed: ${error.message}`));
      return { success: false, message: error.message || "Validation failed" };
    }
  }
);

// Thunk to validate credentials from user input and save them only on success
export const validateAndSaveApiCredentials = createAsyncThunk(
  "settings/validateAndSaveApiCredentials",
  async (payload: { token: string; secret: string }, { getState, dispatch }) => {
    const token = payload.token.trim();
    const secret = payload.secret.trim();
    const { settings } = getState() as RootState;
    const previousToken = settings.apiToken;
    const previousSecret = settings.apiSecret;

    if (!token || !secret) {
      dispatch(setTokenValidated(false));
      dispatch(setValidationMessage("Token and Secret cannot be empty."));
      return { success: false, message: "Token and Secret cannot be empty." };
    }

    dispatch(setValidationMessage("Testing credentials..."));
    dispatch(setTokenValidated(false));

    try {
      // Temporarily store the new credentials so the main process can use them
      await window.electronStore.set("apiToken", token);
      await window.electronStore.set("apiSecret", secret);
      switchBotApi.setCredentials(token, secret);
      dispatch(setApiCredentials({ token, secret }));

      // Attempt to fetch devices as a validation step
      await switchBotApi.getDevices();

      dispatch(setTokenValidated(true));
      dispatch(setValidationMessage("Credentials validated and saved successfully."));
      return { success: true, message: "Credentials validated and saved successfully." };
    } catch (error: any) {
      console.error("Failed to validate and save API credentials:", error);

      // Revert to previous credentials in both store and state
      if (previousToken && previousSecret) {
        await window.electronStore.set("apiToken", previousToken);
        await window.electronStore.set("apiSecret", previousSecret);
        switchBotApi.setCredentials(previousToken, previousSecret);
        dispatch(setApiCredentials({ token: previousToken, secret: previousSecret }));
      } else {
        dispatch(clearApiCredentials());
      }

      const message = error?.message || "Validation failed";
      dispatch(setTokenValidated(false));
      dispatch(setValidationMessage(`Validation failed: ${message}`));
      return { success: false, message };
    }
  }
);


export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setApiCredentials: (
      state,
      action: PayloadAction<{ token: string; secret: string }>
    ) => {
      state.apiToken = action.payload.token;
      state.apiSecret = action.payload.secret;
      // state.isTokenValidated = false; // Validation should be explicit via test
      // state.validationMessage = null;
    },
    clearApiCredentials: (state) => {
      state.apiToken = null;
      state.apiSecret = null;
      state.isTokenValidated = false;
      state.validationMessage = null;
      // Also clear from electron-store
      window.electronStore.delete("apiToken");
      window.electronStore.delete("apiSecret");
    },
    setTokenValidated: (state, action: PayloadAction<boolean>) => {
      state.isTokenValidated = action.payload;
    },
    setValidationMessage: (state, action: PayloadAction<string | null>) => {
      state.validationMessage = action.payload;
    },
    setPollingInterval: (state, action: PayloadAction<number>) => {
      state.pollingIntervalSeconds = action.payload;
      window.electronStore.set("pollingIntervalSeconds", action.payload);
    },
    setTheme: (state, action: PayloadAction<"light" | "dark" | "system">) => {
      state.theme = action.payload;
      window.electronStore.set("theme", action.payload);
    },
    setLanguage: (state, action: PayloadAction<"en" | "ja">) => {
      state.language = action.payload;
      window.electronStore.set("language", action.payload);
    },
    // ... other reducers
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadApiCredentials.fulfilled, (state, action) => {
        if (action.payload) {
          // Credentials loaded, no explicit message unless testing is also done.
        } else {
          state.validationMessage = "No API credentials found in store.";
        }
      })
      .addCase(loadApiCredentials.rejected, (state) => {
        state.validationMessage = "Failed to load credentials from store.";
      })
      .addCase(saveApiCredentials.rejected, (state, action) => {
        // Message is set directly in thunk for more specific error
      })
      .addCase(testApiCredentials.pending, (state) => {
        state.isTokenValidated = false; // Ensure validation is false during pending
      });
  },
});

export const {
  setApiCredentials,
  clearApiCredentials,
  setTokenValidated,
  setValidationMessage,
  setPollingInterval,
  setTheme,
  setLanguage,
} = settingsSlice.actions;

export const selectApiToken = (state: RootState) => state.settings.apiToken;
export const selectApiSecret = (state: RootState) => state.settings.apiSecret;
export const selectIsTokenValidated = (state: RootState) => state.settings.isTokenValidated;
export const selectValidationMessage = (state: RootState) => state.settings.validationMessage;
export const selectPollingInterval = (state: RootState) => state.settings.pollingIntervalSeconds;
export const selectTheme = (state: RootState) => state.settings.theme;
export const selectLanguage = (state: RootState) => state.settings.language;

export default settingsSlice.reducer;
