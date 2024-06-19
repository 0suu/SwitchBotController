import { contextBridge, ipcRenderer } from "electron";

// Define the API structure that will be exposed to the renderer
export interface ElectronStoreAPI {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<{success: boolean, error?: string}>;
  delete: (key: string) => Promise<{success: boolean, error?: string}>;
  getAll: () => Promise<Record<string, any> | undefined>;
}

// Define the SwitchBot API structure
export interface SwitchBotBridgeAPI {
  getDevices: () => Promise<any>;
  getDeviceStatus: (deviceId: string) => Promise<any>;
  sendCommand: (deviceId: string, command: string, parameter?: any, commandType?: "command" | "customize") => Promise<any>;
  getScenes: () => Promise<any>;
  executeScene: (sceneId: string) => Promise<any>;
}

const electronStoreApi: ElectronStoreAPI = {
  get: (key) => ipcRenderer.invoke("electron-store-get", key),
  set: (key, val) => ipcRenderer.invoke("electron-store-set", key, val),
  delete: (key) => ipcRenderer.invoke("electron-store-delete", key),
  getAll: () => ipcRenderer.invoke("electron-store-get-all"),
};

// Implement the SwitchBot API bridge
const switchBotBridgeApi: SwitchBotBridgeAPI = {
  getDevices: () => ipcRenderer.invoke("switchbot-api-get-devices"),
  getDeviceStatus: (deviceId) => ipcRenderer.invoke("switchbot-api-get-device-status", deviceId),
  sendCommand: (deviceId, command, parameter, commandType) => 
    ipcRenderer.invoke("switchbot-api-send-command", deviceId, command, parameter, commandType),
  getScenes: () => ipcRenderer.invoke("switchbot-api-get-scenes"),
  executeScene: (sceneId) => ipcRenderer.invoke("switchbot-api-execute-scene", sceneId),
};

contextBridge.exposeInMainWorld("electronStore", electronStoreApi);
contextBridge.exposeInMainWorld("switchBotBridge", switchBotBridgeApi);

// Keep other exposed APIs if any (e.g., from previous preload setup)
contextBridge.exposeInMainWorld("electronAPI", {
  // Example: send: (channel, data) => ipcRenderer.send(channel, data),
  // receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});

console.log("Preload script: electronStore API exposed.");
console.log("Preload script: switchBotBridge API exposed.");
