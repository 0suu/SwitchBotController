// Portable Linux archives have no supported in-place updater. Do not query
// AppImage metadata or allow quitAndInstall() to terminate an archive install.
export function getUpdateUnavailableReason(isPackaged: boolean, platform: NodeJS.Platform): string | undefined {
  if (!isPackaged) return "Update check is not available in development mode.";
  if (platform !== "win32" && platform !== "darwin") {
    return "Update manually by downloading and extracting a newer Linux ARM64 archive.";
  }
  return undefined;
}
