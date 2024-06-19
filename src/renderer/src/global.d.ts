// src/renderer/src/global.d.ts
// This definition helps TypeScript understand objects exposed from preload script via contextBridge.

// Assuming ElectronStoreAPI is exported from your preload script or its type definition file
// If your preload.ts exports the type, you might do:
// import type { ElectronStoreAPI } from "../../preload/preload"; // Adjust path based on your structure

// For simplicity if not directly exporting type from preload.ts, redefine or match structure:
export interface ElectronStoreAPI {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<{success: boolean, error?: string}>;
  delete: (key: string) => Promise<{success: boolean, error?: string}>;
  getAll: () => Promise<Record<string, any> | undefined>;
}

// SwitchBot API Bridge interface
export interface SwitchBotBridgeAPI {
  getDevices: () => Promise<any>;
  getDeviceStatus: (deviceId: string) => Promise<any>;
  sendCommand: (deviceId: string, command: string, parameter?: any, commandType?: "command" | "customize") => Promise<any>;
  getScenes: () => Promise<any>;
  executeScene: (sceneId: string) => Promise<any>;
}

declare global {
  interface Window {
    electronStore: ElectronStoreAPI;
    switchBotBridge: SwitchBotBridgeAPI;
    // electronAPI: any; // If you exposed other things
  }
}

// Ensure this file is included in your tsconfig.renderer.json
// "include": ["src", "src/global.d.ts"] (or similar)
