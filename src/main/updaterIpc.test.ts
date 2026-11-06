import { app, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

jest.mock("electron", () => ({
  app: {
    isPackaged: true,
    getPath: () => "/tmp/switchbot-updater-test",
    // Do not create a GUI or read credentials in this IPC registration test.
    whenReady: () => new Promise(() => {}),
    on: jest.fn(),
  },
  ipcMain: { handle: jest.fn() },
}));
jest.mock("electron-store", () => ({ __esModule: true, default: jest.fn(() => ({ path: "mock-store" })) }));
jest.mock("fs", () => ({ __esModule: true, default: { existsSync: () => false } }));
jest.mock("path", () => ({ __esModule: true, default: jest.requireActual("path") }));
jest.mock("electron-updater", () => ({
  autoUpdater: {
    checkForUpdates: jest.fn().mockResolvedValue({ updateInfo: { version: "9.0.0" } }),
    quitAndInstall: jest.fn(),
  },
}));

import "./main";

const handler = (name: string) => (ipcMain.handle as jest.Mock).mock.calls.find(([channel]) => channel === name)[1];

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;

describe("updater IPC platform guard", () => {
  beforeEach(() => {
    (autoUpdater.checkForUpdates as jest.Mock).mockClear();
    (autoUpdater.quitAndInstall as jest.Mock).mockClear();
  });
  afterEach(() => {
    Object.defineProperty(process, "platform", originalPlatform);
    Object.defineProperty(app, "isPackaged", { value: true });
  });

  it("blocks packaged Linux update checks and never quits to install", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(await handler("updater-check")()).toEqual({ success: false, error: expect.stringContaining("manually") });
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
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });
});
