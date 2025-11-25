// src/renderer/src/store/slices/deviceSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { switchBotApi, CommandResponseBody } from "../../../../api/apiClient";
import { AnyDevice, DeviceListResponseBody, DeviceStatusResponseBody, InfraredRemote } from "../../../../api/types";
import { RootState } from "../store";

export interface DeviceListState {
  devices: AnyDevice[];
  remoteDevices: InfraredRemote[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  deviceStatuses: Record<string, DeviceStatusResponseBody | undefined>;
}

export interface SelectedDeviceStatusState {
  status: DeviceStatusResponseBody | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedStatus: number | null;
  deviceId: string | null;
}

export interface CombinedDeviceState extends DeviceListState {
  deviceOrder: string[];
  deviceOrderLoaded: boolean;
  selectedDevice: SelectedDeviceStatusState;
  commandSending: boolean;
  commandError: string | null;
  isPollingStatus: boolean;
  commandErrorByDevice: Record<string, string | undefined>;
  commandSendingByDevice: Record<string, number>;
}

const initialState: CombinedDeviceState = {
  devices: [],
  remoteDevices: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  deviceStatuses: {},
  deviceOrder: [],
  deviceOrderLoaded: false,
  selectedDevice: {
    status: null,
    isLoading: false,
    error: null,
    lastFetchedStatus: null,
    deviceId: null,
  },
  commandSending: false,
  commandError: null,
  isPollingStatus: false,
  commandErrorByDevice: {},
  commandSendingByDevice: {},
};

const recomputeCommandSendingFlag = (state: CombinedDeviceState) => {
  state.commandSending = Object.values(state.commandSendingByDevice).some((count) => count > 0);
};

const incrementCommandCounter = (state: CombinedDeviceState, deviceId: string) => {
  state.commandSendingByDevice[deviceId] = (state.commandSendingByDevice[deviceId] || 0) + 1;
  recomputeCommandSendingFlag(state);
};

const decrementCommandCounter = (state: CombinedDeviceState, deviceId: string | undefined) => {
  if (!deviceId) {
    recomputeCommandSendingFlag(state);
    return;
  }
  if (state.commandSendingByDevice[deviceId]) {
    state.commandSendingByDevice[deviceId] = Math.max(0, state.commandSendingByDevice[deviceId] - 1);
    if (state.commandSendingByDevice[deviceId] === 0) {
      delete state.commandSendingByDevice[deviceId];
    }
  }
  recomputeCommandSendingFlag(state);
};

const DEVICE_ORDER_STORAGE_KEY = "deviceOrder";

const persistDeviceOrder = (order: string[]) => {
  try {
    void window.electronStore.set(DEVICE_ORDER_STORAGE_KEY, order);
  } catch (error) {
    console.error("Failed to persist device order:", error);
  }
};

const applyDeviceOrder = (devices: AnyDevice[], desiredOrder: string[]) => {
  const idToDevice = new Map(devices.map((device) => [device.deviceId, device]));
  const seen = new Set<string>();
  const orderedDevices: AnyDevice[] = [];

  desiredOrder.forEach((id) => {
    const device = idToDevice.get(id);
    if (device && !seen.has(id)) {
      orderedDevices.push(device);
      seen.add(id);
    }
  });

  devices.forEach((device) => {
    if (!seen.has(device.deviceId)) {
      orderedDevices.push(device);
      seen.add(device.deviceId);
    }
  });

  const normalizedOrder = orderedDevices.map((device) => device.deviceId);
  return { orderedDevices, normalizedOrder };
};

export const loadDeviceOrder = createAsyncThunk("devices/loadDeviceOrder", async () => {
  try {
    const stored = await window.electronStore.get(DEVICE_ORDER_STORAGE_KEY);
    if (Array.isArray(stored)) {
      return stored.filter((value): value is string => typeof value === "string");
    }
  } catch (error) {
    console.error("Failed to load device order from store:", error);
  }
  return [];
});

export const fetchDevices = createAsyncThunk(
  "devices/fetchDevices",
  async (_, { getState, dispatch, rejectWithValue }) => {
    const { settings } = getState() as RootState;
    if (!settings.apiToken || !settings.isTokenValidated) {
      dispatch(setError("API credentials are not set or not validated. Please check settings."));
      return rejectWithValue("API credentials are not set or not validated.");
    }
    if (settings.apiToken && settings.apiSecret) {
      switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
    } else {
      dispatch(setError("API token or secret is missing."));
      return rejectWithValue("API token or secret is missing.");
    }

    try {
      const response: DeviceListResponseBody = await switchBotApi.getDevices();
      const physicalDevices = response.deviceList || [];
      const infraredRemoteList = (response.infraredRemoteList || []).map((remote) => ({
        ...remote,
        deviceType: remote.deviceType || remote.remoteType,
        enableCloudService: true,
        isInfraredRemote: true as const,
      }));
      return { devices: [...physicalDevices, ...infraredRemoteList], remoteDevices: infraredRemoteList };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch devices");
    }
  }
);

export const fetchDeviceStatus = createAsyncThunk(
  "devices/fetchDeviceStatus",
  async (deviceId: string, { getState, dispatch, rejectWithValue }) => {
    const { settings } = getState() as RootState;
    if (!settings.apiToken || !settings.isTokenValidated) {
      dispatch(setSelectedDeviceError({ deviceId, error: "API credentials are not set or not validated." }));
      return rejectWithValue("API credentials are not set or not validated.");
    }
    if (settings.apiToken && settings.apiSecret) {
      switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
    } else {
      dispatch(setSelectedDeviceError({ deviceId, error: "API token or secret is missing." }));
      return rejectWithValue("API token or secret is missing.");
    }
    try {
      const response: DeviceStatusResponseBody = await switchBotApi.getDeviceStatus(deviceId);
      return { deviceId, status: response };
    } catch (error: any) {
      return rejectWithValue({ deviceId, error: error.message || "Failed to fetch device status" });
    }
  }
);

export const sendDeviceCommand = createAsyncThunk(
  "devices/sendCommand",
  async (
    payload: { deviceId: string; command: string; parameter?: any; commandType?: "command" | "customize" },
    { getState, dispatch, rejectWithValue }
  ) => {
    const { deviceId, command, parameter, commandType } = payload;
    const { settings, devices } = getState() as RootState;
    if (!settings.apiToken || !settings.isTokenValidated) {
      return rejectWithValue("API credentials are not set or not validated.");
    }
    if (settings.apiToken && settings.apiSecret) {
      switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
    } else {
      return rejectWithValue("API token or secret is missing.");
    }
    try {
      const response: CommandResponseBody = await switchBotApi.sendCommand(deviceId, command, parameter, commandType);
      const target = devices.devices.find((d) => d.deviceId === deviceId);
      if (!target || !(target as any).isInfraredRemote) {
        dispatch(fetchDeviceStatus(deviceId));
      }
      return { deviceId, command, response };
    } catch (error: any) {
      return rejectWithValue({ deviceId, command, error: error.message || `Failed to send command ${command}` });
    }
  }
);

export const pollAllDeviceStatuses = createAsyncThunk(
  "devices/pollAllDeviceStatuses",
  async (_, { getState, rejectWithValue }) => {
    const { settings, devices: deviceState } = getState() as RootState;
    if (!settings.apiToken || !settings.isTokenValidated) {
      return rejectWithValue("API credentials not set or validated for polling.");
    }
    if (!deviceState.devices || deviceState.devices.length === 0) {
      return rejectWithValue("No devices to poll.");
    }
    if (settings.apiToken && settings.apiSecret) {
      switchBotApi.setCredentials(settings.apiToken, settings.apiSecret);
    } else {
      return rejectWithValue("API token or secret is missing for polling.");
    }

    const statusPromises = deviceState.devices
      .filter((device) => !(device as any).isInfraredRemote)
      .map((device) =>
        switchBotApi
          .getDeviceStatus(device.deviceId)
          .then((status) => ({ deviceId: device.deviceId, status }))
          .catch((error) => ({ deviceId: device.deviceId, error: error.message || "Polling failed" }))
      );

    try {
      const results = await Promise.all(statusPromises);
      return results;
    } catch (error: any) {
      return rejectWithValue("Error in Promise.all for polling device statuses.");
    }
  }
);

export const deviceSlice = createSlice({
  name: "devices",
  initialState,
  reducers: {
    setDevices: (state, action: PayloadAction<AnyDevice[]>) => {
      state.devices = action.payload;
      state.isLoading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearDevices: (state) => {
      state.devices = [];
      state.remoteDevices = [];
      state.lastFetched = null;
      state.error = null;
      state.deviceStatuses = {};
    },
    clearSelectedDeviceStatus: (state) => {
      state.selectedDevice = {
        status: null,
        isLoading: false,
        error: null,
        lastFetchedStatus: null,
        deviceId: null,
      };
    },
    setSelectedDeviceError: (state, action: PayloadAction<{ deviceId: string; error: string | null }>) => {
      if (state.selectedDevice.deviceId === action.payload.deviceId || state.selectedDevice.deviceId === null) {
        state.selectedDevice.error = action.payload.error;
        state.selectedDevice.isLoading = false;
      }
    },
    clearCommandError: (state) => {
      state.commandError = null;
      state.commandErrorByDevice = {};
    },
    clearDeviceCommandError: (state, action: PayloadAction<string>) => {
      delete state.commandErrorByDevice[action.payload];
      state.commandError = Object.values(state.commandErrorByDevice).find(Boolean) || null;
    },
    updateDeviceInList: (state, action: PayloadAction<{ deviceId: string; status?: DeviceStatusResponseBody; error?: string }>) => {
      const deviceIndex = state.devices.findIndex((d) => d.deviceId === action.payload.deviceId);
      if (deviceIndex !== -1) {
        if (action.payload.status && state.selectedDevice.deviceId === action.payload.deviceId) {
          state.selectedDevice.status = action.payload.status;
          state.selectedDevice.lastFetchedStatus = Date.now();
          state.selectedDevice.error = null;
        }
      }
    },
    setDeviceOrder: (state, action: PayloadAction<string[]>) => {
      state.deviceOrder = action.payload;
      state.deviceOrderLoaded = true;
      persistDeviceOrder(state.deviceOrder);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchDevices.fulfilled,
        (state, action: PayloadAction<{ devices: AnyDevice[]; remoteDevices: InfraredRemote[] }>) => {
          state.devices = action.payload.devices;
          state.remoteDevices = action.payload.remoteDevices;
          state.isLoading = false;
          state.lastFetched = Date.now();
        }
      )
      .addCase(fetchDevices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchDeviceStatus.pending, (state, action) => {
        state.selectedDevice.isLoading = true;
        state.selectedDevice.error = null;
        state.selectedDevice.deviceId = action.meta.arg;
      })
      .addCase(fetchDeviceStatus.fulfilled, (state, action: PayloadAction<{ deviceId: string; status: DeviceStatusResponseBody }>) => {
        if (state.selectedDevice.deviceId === action.payload.deviceId) {
          state.selectedDevice.status = action.payload.status;
          state.selectedDevice.isLoading = false;
          state.selectedDevice.lastFetchedStatus = Date.now();
        }
        state.deviceStatuses[action.payload.deviceId] = action.payload.status;
      })
      .addCase(fetchDeviceStatus.rejected, (state, action) => {
        const payload = action.payload as { deviceId: string; error: string };
        if (state.selectedDevice.deviceId === payload.deviceId) {
          state.selectedDevice.isLoading = false;
          state.selectedDevice.error = payload.error;
        }
      });

    builder
      .addCase(sendDeviceCommand.pending, (state, action) => {
        const deviceId = action.meta.arg.deviceId;
        state.commandError = null;
        delete state.commandErrorByDevice[deviceId];
        incrementCommandCounter(state, deviceId);
      })
      .addCase(sendDeviceCommand.fulfilled, (state, action) => {
        const { deviceId, command } = action.payload;
        decrementCommandCounter(state, deviceId);
        console.log(`Command ${command} sent to ${deviceId} successfully.`);
      })
      .addCase(sendDeviceCommand.rejected, (state, action) => {
        const payload = action.payload as { error?: string; deviceId?: string };
        const deviceIdFromMeta = (action.meta as any)?.arg?.deviceId as string | undefined;
        const deviceId = payload?.deviceId || deviceIdFromMeta;
        decrementCommandCounter(state, deviceId);
        const errorMessage = payload?.error || action.error.message || "Failed to send command";
        state.commandError = errorMessage;
        if (deviceId) {
          state.commandErrorByDevice[deviceId] = errorMessage;
        }
      });

    builder
      .addCase(pollAllDeviceStatuses.pending, (state) => {
        state.isPollingStatus = true;
      })
      .addCase(
        pollAllDeviceStatuses.fulfilled,
        (state, action: PayloadAction<Array<{ deviceId: string; status?: DeviceStatusResponseBody; error?: string }>>) => {
          state.isPollingStatus = false;
          action.payload.forEach((result) => {
            if (result.status) {
              state.deviceStatuses[result.deviceId] = result.status;
              if (state.selectedDevice.deviceId === result.deviceId) {
                state.selectedDevice.status = result.status;
                state.selectedDevice.lastFetchedStatus = Date.now();
                state.selectedDevice.error = null;
              }
            } else if (result.error && state.selectedDevice.deviceId === result.deviceId) {
              state.selectedDevice.error = `Polling failed: ${result.error}`;
            }
          });
        }
      )
      .addCase(pollAllDeviceStatuses.rejected, (state, action) => {
        state.isPollingStatus = false;
        console.error("Polling all device statuses failed:", action.payload);
      });

    builder
      .addCase(loadDeviceOrder.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.deviceOrderLoaded = true;
        state.deviceOrder = action.payload;
      })
      .addCase(loadDeviceOrder.rejected, (state) => {
        state.deviceOrderLoaded = true;
      });
  },
});

export const {
  setDevices,
  setLoading,
  setError,
  clearDevices,
  clearSelectedDeviceStatus,
  setSelectedDeviceError,
  clearCommandError,
  clearDeviceCommandError,
  updateDeviceInList,
  setDeviceOrder,
} = deviceSlice.actions;
export const selectAllDevices = (state: RootState) => state.devices.devices;
export const selectDeviceByIdFromList = (state: RootState, deviceId: string) =>
  state.devices.devices.find((device) => device.deviceId === deviceId);
export const selectDevicesLoading = (state: RootState) => state.devices.isLoading;
export const selectDevicesError = (state: RootState) => state.devices.error;
export const selectSelectedDeviceStatus = (state: RootState) => state.devices.selectedDevice.status;
export const selectSelectedDeviceIsLoading = (state: RootState) => state.devices.selectedDevice.isLoading;
export const selectSelectedDeviceError = (state: RootState) => state.devices.selectedDevice.error;
export const selectSelectedDeviceId = (state: RootState) => state.devices.selectedDevice.deviceId;
export const selectCommandSending = (state: RootState) => state.devices.commandSending;
export const selectCommandError = (state: RootState) => state.devices.commandError;
export const selectCommandErrorForDevice = (state: RootState, deviceId: string) =>
  state.devices.commandErrorByDevice[deviceId] || null;
export const selectIsCommandSendingForDevice = (state: RootState, deviceId: string) =>
  !!state.devices.commandSendingByDevice[deviceId];
export const selectIsPollingStatus = (state: RootState) => state.devices.isPollingStatus;
export const selectInfraredRemotes = (state: RootState) => state.devices.remoteDevices;
export const selectDeviceStatusMap = (state: RootState) => state.devices.deviceStatuses;
export const selectDeviceStatusById = (state: RootState, deviceId: string) => state.devices.deviceStatuses[deviceId];
export const selectDeviceOrderLoaded = (state: RootState) => state.devices.deviceOrderLoaded;
export const selectDeviceOrder = (state: RootState) => state.devices.deviceOrder;

export default deviceSlice.reducer;
