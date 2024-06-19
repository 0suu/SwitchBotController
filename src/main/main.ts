import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import Store from "electron-store";
import axios from "axios";
import crypto from "crypto";

// Define a schema for your store if you want type safety and defaults
interface AppSettings {
  apiToken?: string;
  apiSecret?: string;
  pollingIntervalSeconds?: number;
  theme?: "light" | "dark";
  logRetentionDays?: number;
}

const schema = {
  apiToken: { type: "string" },
  apiSecret: { type: "string" }, // For storing the secret, consider encryption
  pollingIntervalSeconds: { type: "number", default: 10 },
  theme: { type: "string", default: "dark" },
  logRetentionDays: { type: "number", default: 7 },
};

// Initialize electron-store
// To enable encryption, you would set `encryptionKey`
// e.g., encryptionKey: "your-strong-encryption-key" (this should be handled securely, not hardcoded like this)
// Or rely on keytar by not setting it if keytar is installed and works.
// For this setup, we will define it with a placeholder name.
// Actual secure key management for encryptionKey is complex and might involve user input or OS keychain.
// For now, we demonstrate the structure.
const store = new Store<AppSettings>({
  schema,
  name: "switchbot-client-config", // Name of the config file (without extension)
  // encryptionKey: "your-secret-key", // Example: enables AES-256 encryption.
  // IMPORTANT: A fixed key here is not secure for distribution.
  // For real app, explore dynamic keys or keytar.
  // If keytar is available and this is omitted, it might auto-use it.
});


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000, // Increased width a bit
    height: 700, // Increased height a bit
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true, // Hide the default menu bar
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173"); // Vite dev server URL
    mainWindow.webContents.openDevTools();
  } else {
    // Use an absolute path for production
    const rendererPath = path.join(app.getAppPath(), "dist_renderer", "index.html");
    console.log("[Main] Loading renderer from:", rendererPath);
    mainWindow.loadFile(rendererPath);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

console.log("[Main] electron-store initialized. IPC handlers ready.");
console.log("[Main] SwitchBot API IPC handlers ready.");
console.log("[Main] Config file path:", store.path);
