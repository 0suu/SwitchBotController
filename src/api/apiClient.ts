// src/api/apiClient.ts
import {
  DeviceListResponseBody,
  DeviceStatusResponseBody,
  SceneListResponseBody,
  SceneExecuteResponseBody,
} from "./types"; // Assuming AnyDevice might be useful for command types
import { isMockMode } from "../appMode";
import { mockSwitchBotBridge } from "./mockSwitchBotBridge";

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

type SwitchBotBridgeResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SwitchBotBridgeLike = {
  getDevices: () => Promise<SwitchBotBridgeResponse<any>>;
  getDeviceStatus: (deviceId: string) => Promise<SwitchBotBridgeResponse<any>>;
  sendCommand: (
    deviceId: string,
    command: string,
    parameter?: any,
    commandType?: "command" | "customize"
  ) => Promise<SwitchBotBridgeResponse<any>>;
  getScenes: () => Promise<SwitchBotBridgeResponse<any>>;
  executeScene: (sceneId: string) => Promise<SwitchBotBridgeResponse<any>>;
};


export class SwitchBotAPI {
  private token: string | null = null;
  private secret: string | null = null;

  constructor() {
    // We'll use the IPC bridge to communicate with the main process
  }

  setCredentials(token: string, secret: string) {
    this.token = token;
    this.secret = secret;
  }

  isConfigured(): boolean {
    return isMockMode || (!!this.token && !!this.secret);
  }

  private getBridge(): SwitchBotBridgeLike {
    if (isMockMode) {
      return mockSwitchBotBridge as SwitchBotBridgeLike;
    }
    if (typeof window !== "undefined" && window.switchBotBridge) {
      return window.switchBotBridge as unknown as SwitchBotBridgeLike;
    }
    throw new Error("SwitchBot bridge is not available.");
  }

  async getDevices(): Promise<DeviceListResponseBody> {
    if (!this.isConfigured()) {
      throw new Error("API token and secret not set. Call setCredentials first.");
    }

    try {
      const bridge = this.getBridge();
      const response = await bridge.getDevices();

      if (!response.success || !response.data) {
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
      const bridge = this.getBridge();
      const response = await bridge.getDeviceStatus(deviceId);

      if (!response.success || !response.data) {
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
      const bridge = this.getBridge();
      const response = await bridge.sendCommand(deviceId, command, parameter, commandType);

      if (!response.success || !response.data) {
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

    if (!this.getBridge()?.getScenes) {
      throw new Error("Scenes API bridge not available. Please restart the app to reload preload.js.");
    }

    try {
      const bridge = this.getBridge();
      const response = await bridge.getScenes();

      if (!response.success || !response.data) {
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

    const bridge = this.getBridge();
    if (!bridge?.executeScene) {
      throw new Error("Scenes API bridge not available. Please restart the app to reload preload.js.");
    }

    try {
      const response = await bridge.executeScene(sceneId);

      if (!response.success || !response.data) {
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
}

export const switchBotApi = new SwitchBotAPI();
