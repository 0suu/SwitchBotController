export type UpdateMode = "automatic" | "manual" | "development";

export interface AutoUpdaterAPI {
  getMode: () => Promise<UpdateMode>;
  checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onDownloadProgress: (callback: (info: { percent: number }) => void) => () => void;
  onUpdateError: (callback: (info: { message: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
}
