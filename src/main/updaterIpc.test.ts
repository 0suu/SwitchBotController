import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

jest.mock("electron", () => ({
  app: {
    isPackaged: true,
    getPath: () => "/tmp/switchbot-updater-test",
    getAppPath: () => "/mock-app",
    // Capture startup so tests actually exercise createWindow without a real GUI.
    whenReady: jest.fn(() => ({ then: jest.fn() })),
    on: jest.fn(),
  },
  ipcMain: { handle: jest.fn() },
  BrowserWindow: jest.fn(() => ({
    on: jest.fn(), loadFile: jest.fn(), loadURL: jest.fn(),
    webContents: { openDevTools: jest.fn(), send: jest.fn() },
  })),
}));
jest.mock("electron-store", () => ({ __esModule: true, default: jest.fn(() => ({ path: "mock-store", get: jest.fn() })) }));
jest.mock("fs", () => ({ __esModule: true, default: { existsSync: () => false } }));
jest.mock("path", () => ({ __esModule: true, default: jest.requireActual("path") }));
jest.mock("electron-updater", () => ({
  autoUpdater: {
    checkForUpdates: jest.fn().mockResolvedValue({ updateInfo: { version: "9.0.0" } }),
    quitAndInstall: jest.fn(),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
  },
}));

import "./main";

const handler = (name: string) => (ipcMain.handle as jest.Mock).mock.calls.find(([channel]) => channel === name)[1];

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
const originalResourcesPath = Object.getOwnPropertyDescriptor(process, "resourcesPath");

describe("updater IPC platform guard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (BrowserWindow as unknown as jest.Mock).mockClear();
    (autoUpdater.checkForUpdates as jest.Mock).mockClear();
    (autoUpdater.quitAndInstall as jest.Mock).mockClear();
  });
  afterEach(() => {
    Object.defineProperty(process, "platform", originalPlatform);
    Object.defineProperty(app, "isPackaged", { value: true });
    if (originalResourcesPath) Object.defineProperty(process, "resourcesPath", originalResourcesPath);
    else Reflect.deleteProperty(process, "resourcesPath");
    jest.useRealTimers();
  });

  it("blocks packaged Linux update checks and never quits to install", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(await handler("updater-check")()).toEqual({ success: false, error: expect.stringContaining("manually") });
    expect(handler("updater-mode")()).toBe("manual");
    handler("updater-install")();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it.each(["win32", "darwin"] as const)("retains packaged %s IPC behavior", async platform => {
    Object.defineProperty(process, "platform", { value: platform });
    expect(await handler("updater-check")()).toEqual({ success: true, version: "9.0.0" });
    handler("updater-install")();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("blocks update installation in development", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    Object.defineProperty(app, "isPackaged", { value: false });
    handler("updater-install")();
    expect(handler("updater-mode")()).toBe("development");
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it.each([
    ["linux", true, "/mock-resources/icon.png"],
    ["linux", false, "/mock-app/assets/icon.png"],
    ["win32", true, undefined],
    ["darwin", true, undefined],
  ] as const)("creates a %s window (packaged=%s) with the correct platform icon", (platform, packaged, expectedIcon) => {
    Object.defineProperty(process, "platform", { value: platform });
    Object.defineProperty(process, "resourcesPath", { value: "/mock-resources", configurable: true });
    Object.defineProperty(app, "isPackaged", { value: packaged });
    const ready = (app.whenReady as jest.Mock).mock.results[0].value.then.mock.calls[0][0];
    ready();
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      icon: expectedIcon,
      webPreferences: expect.objectContaining({ contextIsolation: true, nodeIntegration: false }),
    }));
    const win = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
    expect(win.loadFile).toHaveBeenCalledWith("/mock-app/dist_renderer/index.html");
    expect(jest.getTimerCount()).toBe(platform === "linux" || !packaged ? 0 : 1);
  });
});
