import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import path from "path";
import fs from "fs";
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
  pollingIntervalSeconds: { type: "number", default: 60 },
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
let store: Store<AppSettings>;

/**
 * Gets or creates a dynamic encryption key for the app.
 * The key is generated once and stored securely using Electron's safeStorage.
 */
function getEncryptionKey(): string {
  // Use a separate store for the encryption key to avoid chicken-and-egg problem
  const keyStore = new Store({ name: "switchbot-client-auth" });
  let key = keyStore.get("encryptionKey") as string;

  if (!key) {
    // Generate a new 32-byte (256-bit) random key
    const newKey = crypto.randomBytes(32).toString("hex");
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedKey = safeStorage.encryptString(newKey);
        // Store as base64 string
        keyStore.set("encryptionKey", encryptedKey.toString("base64"));
        return newKey;
      } catch (error) {
        console.error("[Main] Failed to encrypt key with safeStorage:", error);
        // Fallback: store unencrypted if encryption fails (better than hardcoded)
        keyStore.set("encryptionKey", newKey);
        return newKey;
      }
    } else {
      console.warn("[Main] safeStorage is not available. Storing key unencrypted.");
      keyStore.set("encryptionKey", newKey);
      return newKey;
    }
  }

  // Key exists, try to decrypt it if safeStorage is available
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(key, "base64");
      return safeStorage.decryptString(buffer);
    } catch (error) {
      // If decryption fails, it might have been stored unencrypted
      // console.log("[Main] Failed to decrypt key, assuming unencrypted.");
      return key;
    }
  }

  return key;
}

/**
 * Initializes the electron-store with encryption.
 */
function initializeStore() {
  const encryptionKey = getEncryptionKey();

  // Basic compatibility: if file exists and is valid JSON, it's unencrypted.
  // electron-store with encryptionKey will fail to read it.
  const configPath = path.join(app.getPath("userData"), "switchbot-client-config.json");
  let useEncryption = true;

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf8");
      JSON.parse(content);
      // If we can parse it, it's not encrypted.
      // For safety and to avoid breaking existing setups, we might skip encryption
      // or migrate. For this task, we'll enable it for new installs or encrypted files.
      console.log("[Main] Existing config is unencrypted. Skipping encryption for compatibility.");
      useEncryption = false;
    } catch (e) {
      // Cannot parse as JSON, probably already encrypted or corrupted.
      useEncryption = true;
    }
  }

  store = new Store<AppSettings>({
    schema,
    name: "switchbot-client-config",
    encryptionKey: useEncryption ? encryptionKey : undefined,
  });

  console.log("[Main] electron-store initialized. Encryption:", useEncryption ? "enabled" : "disabled");
  console.log("[Main] Config file path:", store.path);
}


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

// SwitchBot API constants
const API_BASE_URL = "https://api.switch-bot.com/v1.1";

const buildApiHeaders = () => {
  if (!store) {
    throw new Error("Store not initialized.");
  }
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

app.whenReady().then(() => {
  // Initialize store and IPC handlers
  initializeStore();

  // IPC Handlers for electron-store
  ipcMain.handle("electron-store-get", async (event, key) => {
    try {
      const value = store.get(key);
      return value;
    } catch (error) {
      console.error(`[Main] Error getting value for key ${key}:`, error);
      return undefined;
    }
  });

  ipcMain.handle("electron-store-set", async (event, key, value) => {
    try {
      store.set(key, value);
      return { success: true };
    } catch (error) {
      console.error(`[Main] Error setting value for key ${key}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("electron-store-delete", async (event, key) => {
    try {
      store.delete(key as keyof AppSettings);
      return { success: true };
    } catch (error) {
      console.error(`[Main] Error deleting key ${key}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("electron-store-get-all", async () => {
    try {
      return store.store;
    } catch (error) {
      console.error("[Main] Error getting all store data:", error);
      return undefined;
    }
  });

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

  console.log("[Main] electron-store initialized and IPC handlers ready.");

  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
