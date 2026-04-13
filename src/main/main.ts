import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import Store from "electron-store";
import axios from "axios";
import crypto from "crypto";
import { autoUpdater } from "electron-updater";

// Define a schema for your store if you want type safety and defaults
interface AppSettings {
  apiToken?: string;
  apiSecret?: string;
  pollingIntervalSeconds?: number;
  theme?: "light" | "dark" | "system";
  logRetentionDays?: number;
  language?: "en" | "ja";
  deviceOrder?: string[];
  sceneOrder?: string[];
  nightLightSceneAssignments?: Record<string, string>;
  lastView?: "list" | "settings" | "scenes";
  confirmOnOffPressActions?: Record<string, boolean>;
  windowBounds?: { width: number; height: number; x: number; y: number };
}

const schema = {
  apiToken: { type: "string" },
  apiSecret: { type: "string" }, // For storing the secret, consider encryption
  pollingIntervalSeconds: { type: "number", default: 60 },
  theme: { type: "string", default: "dark" },
  logRetentionDays: { type: "number", default: 7 },
  language: { type: "string", default: "en" },
  deviceOrder: {
    type: "array",
    items: { type: "string" },
    default: [],
  },
  sceneOrder: {
    type: "array",
    items: { type: "string" },
    default: [],
  },
  nightLightSceneAssignments: {
    type: "object",
    default: {},
    additionalProperties: { type: "string" },
  },
  lastView: { type: "string", default: "list" },
  confirmOnOffPressActions: {
    type: "object",
    default: {},
    additionalProperties: { type: "boolean" },
  },
  windowBounds: {
    type: "object",
    properties: {
      width: { type: "number" },
      height: { type: "number" },
      x: { type: "number" },
      y: { type: "number" },
    },
  },
};

// Migrate config from v1.1.0 ("app/switchbot-client-config.json") to v1.2.0.
// In v1.1.0 package.json name was "app", so userData was "%APPDATA%/app/".
// Now name is "switchbot-controller", so userData is "%APPDATA%/switchbot-controller/".
const newUserDataPath = app.getPath("userData");
const oldUserDataPath = path.join(path.dirname(newUserDataPath), "app");
const oldConfigPath = path.join(oldUserDataPath, "switchbot-client-config.json");
const newConfigPath = path.join(newUserDataPath, "switchbot-controller-config.json");
if (fs.existsSync(oldConfigPath) && !fs.existsSync(newConfigPath)) {
  try {
    fs.mkdirSync(newUserDataPath, { recursive: true });
    fs.copyFileSync(oldConfigPath, newConfigPath);
    console.log("[Main] Migrated config from", oldConfigPath, "to", newConfigPath);
  } catch (error) {
    console.error("[Main] Failed to migrate config:", error);
  }
}

const store = new Store<AppSettings>({
  schema,
  name: "switchbot-controller-config", // Name of the config file (without extension)
  // encryptionKey: "your-secret-key", // Example: enables AES-256 encryption.
  // IMPORTANT: A fixed key here is not secure for distribution.
  // For real app, explore dynamic keys or keytar.
  // If keytar is available and this is omitted, it might auto-use it.
});


function createWindow(): BrowserWindow {
  const savedBounds = store.get("windowBounds") as AppSettings["windowBounds"];

  const mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1000,
    height: savedBounds?.height ?? 700,
    x: savedBounds?.x,
    y: savedBounds?.y,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true, // Hide the default menu bar
  });

  // Save window bounds on move and resize (debounced)
  let saveTimeout: ReturnType<typeof setTimeout>;
  const saveBounds = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (!mainWindow.isDestroyed() && !mainWindow.isMinimized() && !mainWindow.isMaximized()) {
        store.set("windowBounds", mainWindow.getBounds());
      }
    }, 500);
  };
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173"); // Vite dev server URL
    mainWindow.webContents.openDevTools();
  } else {
    // Use an absolute path for production
    const rendererPath = path.join(app.getAppPath(), "dist_renderer", "index.html");
    console.log("[Main] Loading renderer from:", rendererPath);
    mainWindow.loadFile(rendererPath);
  }

  return mainWindow;
}

app.whenReady().then(() => {
  const win = createWindow();
  setupAutoUpdater(win);

  // Check for updates after a short delay (skip in dev — app is not packaged)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error("[AutoUpdater] Initial check failed:", err.message);
      });
    }, 3000);
  }

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow();
      setupAutoUpdater(newWin);
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers for electron-store
ipcMain.handle("electron-store-get", async (event, key) => {
  try {
    const value = store.get(key);
    // console.log(`[Main] Store GET - Key: ${key}, Value:`, value);
    return value;
  } catch (error) {
    console.error(`[Main] Error getting value for key ${key}:`, error);
    return undefined; // Or throw error
  }
});

ipcMain.handle("electron-store-set", async (event, key, value) => {
  try {
    // console.log(`[Main] Store SET - Key: ${key}, Value:`, value);
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error(`[Main] Error setting value for key ${key}:`, error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("electron-store-delete", async (event, key) => {
  try {
    // console.log(`[Main] Store DELETE - Key: ${key}`);
    store.delete(key as keyof AppSettings); // Type assertion
    return { success: true };
  } catch (error) {
    console.error(`[Main] Error deleting key ${key}:`, error);
    return { success: false, error: (error as Error).message };
  }
});

// Example: How to get all data (useful for debugging or loading initial state)
ipcMain.handle("electron-store-get-all", async () => {
  try {
    return store.store;
  } catch (error) {
    console.error("[Main] Error getting all store data:", error);
    return undefined;
  }
});

// SwitchBot API constants
const API_BASE_URL = "https://api.switch-bot.com/v1.1";

const buildApiHeaders = () => {
  const token = store.get("apiToken") as string;
  const secret = store.get("apiSecret") as string;

  if (!token || !secret) {
    throw new Error("API token and secret not set.");
  }

  const t = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const data = token + t + nonce;
  const signTerm = crypto.createHmac("sha256", secret).update(data).digest("base64");

  return {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf8",
      "t": t.toString(),
      "sign": signTerm,
      "nonce": nonce
    }
  };
};

// SwitchBot API handlers
ipcMain.handle("switchbot-api-get-devices", async () => {
  try {
    const { headers } = buildApiHeaders();
    const response = await axios.get(`${API_BASE_URL}/devices`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("[Main] SwitchBot API Error (getDevices):", error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
  }
});

ipcMain.handle("switchbot-api-get-device-status", async (event, deviceId) => {
  try {
    const { headers } = buildApiHeaders();
    const response = await axios.get(`${API_BASE_URL}/devices/${deviceId}/status`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(`[Main] SwitchBot API Error (getDeviceStatus - ${deviceId}):`, error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
  }
});

ipcMain.handle("switchbot-api-send-command", async (event, deviceId, command, parameter = "default", commandType: "command" | "customize" = "command") => {
  try {
    const { headers } = buildApiHeaders();

    const requestBody = {
      commandType: commandType || "command",
      command: command,
      parameter: parameter
    };

    const response = await axios.post(`${API_BASE_URL}/devices/${deviceId}/commands`, requestBody, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(`[Main] SwitchBot API Error (sendCommand - ${deviceId}):`, error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
  }
});

ipcMain.handle("switchbot-api-get-scenes", async () => {
  try {
    const { headers } = buildApiHeaders();
    const response = await axios.get(`${API_BASE_URL}/scenes`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("[Main] SwitchBot API Error (getScenes):", error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
  }
});

ipcMain.handle("switchbot-api-execute-scene", async (event, sceneId) => {
  try {
    const { headers } = buildApiHeaders();
    const response = await axios.post(`${API_BASE_URL}/scenes/${sceneId}/execute`, {}, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(`[Main] SwitchBot API Error (executeScene - ${sceneId}):`, error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
  }
});

// ── Auto-updater ────────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(win: BrowserWindow) {
  // Remove all previous listeners to avoid duplicates on window re-creation (macOS)
  autoUpdater.removeAllListeners();

  const send = (channel: string, ...args: any[]) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  };

  autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version);
    send("update-available", { version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdater] No update available.");
    send("update-not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
    send("update-download-progress", { percent: progress.percent });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded:", info.version);
    send("update-downloaded", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err.message);
    send("update-error", { message: err.message });
  });
}

ipcMain.handle("updater-check", async () => {
  if (!app.isPackaged) {
    return { success: false, error: "Update check is not available in development mode." };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, version: result?.updateInfo?.version };
  } catch (error: any) {
    console.error("[AutoUpdater] Check failed:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("updater-install", () => {
  autoUpdater.quitAndInstall(false, true);
});

console.log("[Main] electron-store initialized. IPC handlers ready.");
console.log("[Main] SwitchBot API IPC handlers ready.");
console.log("[Main] Config file path:", store.path);
