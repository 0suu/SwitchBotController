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

// Auto-updater API
export interface AutoUpdaterAPI {
  checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onDownloadProgress: (callback: (info: { percent: number }) => void) => () => void;
  onUpdateError: (callback: (info: { message: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
}

const autoUpdaterApi: AutoUpdaterAPI = {
  checkForUpdates: () => ipcRenderer.invoke("updater-check"),
  installUpdate: () => ipcRenderer.invoke("updater-install"),
  onUpdateAvailable: (callback) => {
    const listener = (_event: any, info: { version: string }) => callback(info);
    ipcRenderer.on("update-available", listener);
    return () => { ipcRenderer.removeListener("update-available", listener); };
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event: any, info: { version: string }) => callback(info);
    ipcRenderer.on("update-downloaded", listener);
    return () => { ipcRenderer.removeListener("update-downloaded", listener); };
  },
  onDownloadProgress: (callback) => {
    const listener = (_event: any, info: { percent: number }) => callback(info);
    ipcRenderer.on("update-download-progress", listener);
    return () => { ipcRenderer.removeListener("update-download-progress", listener); };
  },
  onUpdateError: (callback) => {
    const listener = (_event: any, info: { message: string }) => callback(info);
    ipcRenderer.on("update-error", listener);
    return () => { ipcRenderer.removeListener("update-error", listener); };
  },
  onUpdateNotAvailable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("update-not-available", listener);
    return () => { ipcRenderer.removeListener("update-not-available", listener); };
  },
};

contextBridge.exposeInMainWorld("autoUpdater", autoUpdaterApi);

// Keep other exposed APIs if any (e.g., from previous preload setup)
contextBridge.exposeInMainWorld("electronAPI", {});

console.log("Preload script: electronStore API exposed.");
console.log("Preload script: switchBotBridge API exposed.");
