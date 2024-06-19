// src/api/apiClient.ts
import {
  DeviceListResponseBody,
  DeviceStatusResponseBody,
  AnyDevice,
  SceneListResponseBody,
  SceneExecuteResponseBody,
} from "./types"; // Assuming AnyDevice might be useful for command types

// We're no longer using direct Axios requests, so we don't need these imports
// import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
// import CryptoJS from "crypto-js";

// We're now using the IPC bridge to communicate with the main process
// const API_BASE_URL = "https://api.switch-bot.com/v1.1";

// Define common command types (can be expanded)
export interface CommandRequestBody {
  commandType: "command" | "customize";
  command: string; // e.g., "turnOn", "turnOff", "setBrightness", "setPosition"
  parameter?: any;  // e.g., "default", 100, "0,0,255"
}

export interface CommandResponseBody {
  statusCode: number;
  message: string;
  body: any; // The structure of body can vary
}


export class SwitchBotAPI {
  private token: string | null = null;
  private secret: string | null = null;

  constructor() {
    // No need to initialize axios client or interceptors
    // We'll use the IPC bridge to communicate with the main process
  }

  setCredentials(token: string, secret: string) {
    this.token = token;
    this.secret = secret;
  }

  isConfigured(): boolean {
    return !!this.token && !!this.secret;
  }

  async getDevices(): Promise<DeviceListResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set. Call setCredentials first.");
    }

    try {
      // Use the IPC bridge to communicate with the main process
      const response = await window.switchBotBridge.getDevices();

      if (!response.success) {
        throw new Error(response.error || "Failed to get devices");
      }

      if (response.data.statusCode === 100) {
        return response.data.body as DeviceListResponseBody;
      } else {
        throw new Error(`API Error: ${response.data.message} (Status Code: ${response.data.statusCode})`);
      }
    } catch (error: any) {
      console.error("Error getting devices:", error);
      throw new Error(error.message || "An unexpected error occurred while getting devices");
    }
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatusResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set.");
    }

    try {
      // Use the IPC bridge to communicate with the main process
      const response = await window.switchBotBridge.getDeviceStatus(deviceId);

      if (!response.success) {
        throw new Error(response.error || `Failed to get status for device ${deviceId}`);
      }

      if (response.data.statusCode === 100) {
        return response.data.body as DeviceStatusResponseBody;
      } else {
        throw new Error(`API Error: ${response.data.message} (Status Code: ${response.data.statusCode})`);
      }
    } catch (error: any) {
      console.error(`Error getting status for device ${deviceId}:`, error);
      throw new Error(error.message || `An unexpected error occurred while getting status for device ${deviceId}`);
    }
  }

  async sendCommand(deviceId: string, command: string, parameter: any = "default", commandType: CommandRequestBody["commandType"] = "command"): Promise<CommandResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set.");
    }

    try {
      // Use the IPC bridge to communicate with the main process
      const response = await window.switchBotBridge.sendCommand(deviceId, command, parameter, commandType);

      if (!response.success) {
        throw new Error(response.error || `Failed to send command to device ${deviceId}`);
      }

      // According to docs, body will be empty {} for most commands on success (statusCode 100)
      if (response.data.statusCode === 100) {
        return response.data as CommandResponseBody;
      } else {
        throw new Error(`API Command Error: ${response.data.message} (Status Code: ${response.data.statusCode})`);
      }
    } catch (error: any) {
      console.error(`Error sending command to device ${deviceId}:`, error);
      throw new Error(error.message || `An unexpected error occurred while sending command to device ${deviceId}`);
    }
  }

  async getScenes(): Promise<SceneListResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set.");
    }

    if (!window.switchBotBridge?.getScenes) {
      throw new Error("Scenes API bridge not available. Please restart the app to reload preload.js.");
    }

    try {
      const response = await window.switchBotBridge.getScenes();

      if (!response.success) {
        throw new Error(response.error || "Failed to get scenes");
      }

      if (response.data.statusCode === 100) {
        return response.data.body as SceneListResponseBody;
      } else {
        throw new Error(`API Error: ${response.data.message} (Status Code: ${response.data.statusCode})`);
      }
    } catch (error: any) {
      console.error("Error getting scenes:", error);
      throw new Error(error.message || "An unexpected error occurred while getting scenes");
    }
  }

  async executeScene(sceneId: string): Promise<SceneExecuteResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set.");
    }

    if (!window.switchBotBridge?.executeScene) {
      throw new Error("Scenes API bridge not available. Please restart the app to reload preload.js.");
    }

    try {
      const response = await window.switchBotBridge.executeScene(sceneId);

      if (!response.success) {
        throw new Error(response.error || `Failed to execute scene ${sceneId}`);
      }

      if (response.data.statusCode === 100) {
        return response.data.body as SceneExecuteResponseBody;
      } else {
        throw new Error(`API Error: ${response.data.message} (Status Code: ${response.data.statusCode})`);
      }
    } catch (error: any) {
      console.error(`Error executing scene ${sceneId}:`, error);
      throw new Error(error.message || `An unexpected error occurred while executing scene ${sceneId}`);
    }
  }

  // We no longer need the handleApiError method since we're handling errors directly in each method
  // and we're no longer using Axios directly
  private handleApiError(error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "An unexpected API error occurred.");
  }
}

export const switchBotApi = new SwitchBotAPI();
