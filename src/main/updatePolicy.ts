export type UpdateMode = "automatic" | "manual" | "development";

// One authoritative mode is used by startup, IPC, and the Settings UI.
export function getUpdateMode(isPackaged: boolean, platform: NodeJS.Platform): UpdateMode {
  if (!isPackaged) return "development";
  return platform === "win32" || platform === "darwin" ? "automatic" : "manual";
}

export function getUpdateUnavailableReason(isPackaged: boolean, platform: NodeJS.Platform): string | undefined {
  const mode = getUpdateMode(isPackaged, platform);
  if (mode === "development") return "Update check is not available in development mode.";
  if (mode === "manual") return "Update this installation manually using a newer archive for the same platform and architecture.";
  return undefined;
}
