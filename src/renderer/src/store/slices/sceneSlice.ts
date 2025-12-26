import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { switchBotApi } from "../../../../api/apiClient";
import { SceneSummary } from "../../../../api/types";
import { RootState } from "../store";

export interface ScenesState {
  scenes: SceneSummary[];
  isLoading: boolean;
  error: string | null;
  executingById: Record<string, boolean>;
  executionErrorById: Record<string, string | undefined>;
  lastFetched: number | null;
  lastExecutedSceneId: string | null;
  sceneOrder: string[];
  sceneOrderLoaded: boolean;
}

const SCENE_ORDER_STORAGE_KEY = "sceneOrder";

const persistSceneOrder = (order: string[]) => {
  try {
    void window.electronStore.set(SCENE_ORDER_STORAGE_KEY, order);
  } catch (error) {
    console.error("Failed to persist scene order:", error);
  }
};

const initialState: ScenesState = {
  scenes: [],
  isLoading: false,
  error: null,
  executingById: {},
  executionErrorById: {},
  lastFetched: null,
  lastExecutedSceneId: null,
  sceneOrder: [],
  sceneOrderLoaded: false,
};

export const loadSceneOrder = createAsyncThunk("scenes/loadSceneOrder", async () => {
  try {
    const stored = await window.electronStore.get(SCENE_ORDER_STORAGE_KEY);
    if (Array.isArray(stored)) {
      return stored.filter((value): value is string => typeof value === "string");
    }
  } catch (error) {
    console.error("Failed to load scene order from store:", error);
  }
  return [];
});

export const fetchScenes = createAsyncThunk("scenes/fetchScenes", async (_, { getState, rejectWithValue }) => {
  const { settings } = getState() as RootState;
  if (!settings.apiToken || !settings.isTokenValidated) {
    return rejectWithValue("API credentials are not set or not validated. Please check settings.");
  }
  if (settings.apiToken && settings.apiSecret) {
    switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
  } else {
    return rejectWithValue("API token or secret is missing.");
  }

  try {
    const scenes = await switchBotApi.getScenes();
    return scenes;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch scenes");
  }
});

export const executeScene = createAsyncThunk(
  "scenes/executeScene",
  async (sceneId: string, { getState, rejectWithValue }) => {
    const { settings } = getState() as RootState;
    if (!settings.apiToken || !settings.isTokenValidated) {
      return rejectWithValue({ sceneId, error: "API credentials are not set or not validated. Please check settings." });
    }
    if (settings.apiToken && settings.apiSecret) {
      switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
    } else {
      return rejectWithValue({ sceneId, error: "API token or secret is missing." });
    }

    try {
      await switchBotApi.executeScene(sceneId);
      return { sceneId };
    } catch (error: any) {
      return rejectWithValue({ sceneId, error: error.message || "Failed to execute scene" });
    }
  }
);

const scenesSlice = createSlice({
  name: "scenes",
  initialState,
  reducers: {
    clearSceneErrors: (state) => {
      state.error = null;
      state.executionErrorById = {};
    },
    clearSceneExecutionError: (state, action: PayloadAction<string>) => {
      delete state.executionErrorById[action.payload];
    },
    clearScenesState: () => ({
      ...initialState,
    }),
    setSceneOrder: (state, action: PayloadAction<string[]>) => {
      state.sceneOrder = action.payload;
      state.sceneOrderLoaded = true;
      persistSceneOrder(state.sceneOrder);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScenes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScenes.fulfilled, (state, action: PayloadAction<SceneSummary[]>) => {
        state.scenes = action.payload;
        state.isLoading = false;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchScenes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || "Failed to fetch scenes";
      });

    builder
      .addCase(executeScene.pending, (state, action) => {
        const sceneId = action.meta.arg;
        state.executingById[sceneId] = true;
        delete state.executionErrorById[sceneId];
        state.lastExecutedSceneId = null;
      })
      .addCase(executeScene.fulfilled, (state, action: PayloadAction<{ sceneId: string }>) => {
        const { sceneId } = action.payload;
        delete state.executingById[sceneId];
        delete state.executionErrorById[sceneId];
        state.lastExecutedSceneId = sceneId;
      })
      .addCase(executeScene.rejected, (state, action) => {
        const payload = action.payload as { sceneId?: string; error?: string } | undefined;
        const sceneId = payload?.sceneId ?? action.meta.arg;
        const errorMessage = payload?.error || action.error.message || "Failed to execute scene";

        if (sceneId) {
          delete state.executingById[sceneId];
          state.executionErrorById[sceneId] = errorMessage;
        }
        state.lastExecutedSceneId = null;
      });

    builder
      .addCase(loadSceneOrder.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.sceneOrderLoaded = true;
        state.sceneOrder = action.payload;
      })
      .addCase(loadSceneOrder.rejected, (state) => {
        state.sceneOrderLoaded = true;
      });
  },
});

export const { clearSceneErrors, clearSceneExecutionError, clearScenesState, setSceneOrder } = scenesSlice.actions;

export const selectScenes = (state: RootState) => state.scenes.scenes;
export const selectScenesLoading = (state: RootState) => state.scenes.isLoading;
export const selectScenesError = (state: RootState) => state.scenes.error;
export const selectSceneIsExecuting = (state: RootState, sceneId: string) => !!state.scenes.executingById[sceneId];
export const selectSceneExecutionError = (state: RootState, sceneId: string) =>
  state.scenes.executionErrorById[sceneId] || null;
export const selectLastExecutedSceneId = (state: RootState) => state.scenes.lastExecutedSceneId;
export const selectSceneOrderLoaded = (state: RootState) => state.scenes.sceneOrderLoaded;
export const selectSceneOrder = (state: RootState) => state.scenes.sceneOrder;

export default scenesSlice.reducer;
