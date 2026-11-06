# Steam Frame desktop / Steam Frame デスクトップ

## Target and scope

Valve documents Steam Frame as **ARM64**, with Arch-based SteamOS 3 and a KDE
Plasma desktop. This build is a native **Linux ARM64** Electron desktop app;
it does not need Proton, FEX, a Windows installer, or a streaming PC. It is not
a VR overlay or a Steam Frame Verified claim. An x64 Steam Deck build is a
different architecture.

Sources:
- [Valve hardware specifications](https://store.steampowered.com/hardware/steamframe)
- [Valve standalone compatibility documentation](https://partner.steamgames.com/doc/steamhardware/steamframe/compatibility)

## Get a build

Until a maintainer includes this target in a release, use GitHub Actions:
open **Linux ARM64 portable build**, select the successful run for the desired
commit, and download the `switchbot-controller-linux-arm64` artifact (GitHub
sign-in required). Unzip that artifact to get
`switchbot-controller-<version>-linux-arm64.tar.gz`. PR artifacts are development
builds: confirm the source commit before entering your API credentials.

To build it yourself, use Node.js 22 and npm on a development machine:

```sh
npm ci
npm run package:linux:arm64
```

The archive is written to `release/`. This command always uses `--publish never`.
CI uses a native ARM64 Linux runner and only uploads a workflow artifact; it
does not create a GitHub Release. Existing Windows/macOS release jobs are unchanged.

## Install and launch on Steam Frame

1. Open the KDE Plasma desktop and download the **linux-arm64** archive.
2. In Dolphin, extract the archive into a permanent, writable folder under your
   home directory, for example `~/Applications/`. Keep the whole extracted folder
   together: the executable needs its `resources/`, libraries, and other files.
3. Open the extracted folder in Konsole. Check `uname -m`: it should say
   `aarch64` (or `arm64`). Start the app as your normal desktop user:

   ```sh
   ./switchbot-controller
   ```

4. In Settings, enter your SwitchBot Cloud API token and secret and validate them.
   Internet access to `api.switch-bot.com` is required; this app uses the Cloud
   API, not local Bluetooth. No Steam account integration is needed.
5. Optional: use KDE Menu Editor to create an application entry, selecting the
   **absolute path** to the extracted `switchbot-controller` executable. Select
   an icon in the editor. Keep the folder in that location so the menu entry
   continues working. Desktop pointer/keyboard input is required; no native VR
   controller mapping is provided.

The packaged runtime includes Electron and Node.js: end users do **not** install
Node/npm. The archive requires neither FUSE nor a package-manager install, and
does not write to SteamOS's read-only system partition. Do not use `sudo`, disable
SteamOS read-only mode, or enable Proton for this native Linux executable.

## Runtime and sandbox troubleshooting

This is a portable application bundle, not a completely static Linux binary.
It still needs the desktop session and compatible ARM64 system libraries:
glibc, GTK 3/GLib, NSS/NSPR, ATK, CUPS, D-Bus, ALSA, GBM/DRM, and X11/XCB
libraries. KDE's XWayland provides the normal X11 desktop path. Actual library
availability, GPU acceleration, and window/input behavior must be checked on
Steam Frame hardware; a successful archive build alone does not prove these.

- `Exec format error`: check that the download is **linux-arm64**, not x64 or macOS.
- `Permission denied`: extract to a local executable filesystem in your home
  directory. Check the executable bit (`chmod u+x ./switchbot-controller` if
  necessary); a `noexec` mount cannot run the app.
- Missing library: run `ldd ./switchbot-controller` and inspect entries marked
  `not found`. Report the SteamOS version and those names. Avoid replacing system
  libraries or installing arbitrary packages into SteamOS's read-only partition.
- No display: launch from a logged-in KDE desktop, not a headless SSH shell.
  For a Wayland-specific display issue you can try
  `./switchbot-controller --ozone-platform=wayland`; keep the default if it works.
- Sandbox error: the extracted `chrome-sandbox` helper is not installed setuid
  root. Chromium needs working unprivileged user namespaces for its normal
  sandbox in this user-writable install. This must be verified on the target OS.
  The app does not add `--no-sandbox`, change kernel policy, or install a privileged
  helper. If namespaces are unavailable, stop and report the error; sandbox
  compatibility is a remaining hardware acceptance check.

[Electron sandbox documentation](https://www.electronjs.org/docs/latest/tutorial/sandbox)

## Updates and saved settings

Linux archives use **manual updates**. Settings explains this and hides the
unsupported update-check button; the main process also rejects update checks and
ignores installation requests. No background update check is scheduled on Linux.
The archive format is not an auto-updatable target in
[electron-builder's updater documentation](https://www.electron.build/v26/docs/features/auto-update/).
Windows/macOS retain their existing updater behavior.

Quit the app, obtain a newer ARM64 archive, extract it to a new folder, and test
that copy before removing the old folder. Update your KDE entry if its path
changes. Settings live outside the bundle in Electron's user-data directory,
normally `~/.config/switchbot-controller/switchbot-controller-config.json`
(`XDG_CONFIG_HOME` can change the location). Tokens and secrets are stored there
in plaintext as on the other platforms. Do not put credentials in the extracted
application folder or attach your config to a bug report.

## Hardware acceptance checklist

Before calling the build supported on a Steam Frame, test the exact artifact
and record the commit, SteamOS version, session type, and any launch flags:

- Start in KDE with the sandbox enabled, using an empty temporary profile first:
  `./switchbot-controller --user-data-dir="$(mktemp -d)"`.
- Check window rendering, keyboard/pointer input, both languages, theme, and
  desktop menu launching. Confirm there are no missing-library or sandbox errors.
- With an explicitly chosen test account/device, save credentials, restart,
  retrieve devices/scenes, and test a safe control action. Do not exercise a live
  device as part of an unattended smoke test.
- Confirm Linux shows manual update guidance and never downloads/replaces the app.
- Check suspend/resume, network loss/reconnection, and persistence after replacing
  the bundle. Repeat on the default display backend before testing Wayland flags.

## 日本語の要点

Steam Frame は ARM64版SteamOSです。Actions の **Linux ARM64 portable build**
から成果物を取得し、ZIP内の `linux-arm64.tar.gz` をホーム配下に展開して、
展開フォルダー内で `./switchbot-controller` を実行してください。Node.js、FUSE、
Proton、sudo、SteamOSの読み取り専用解除は不要です。KDEメニューへの登録は
メニューエディターから実行ファイルの絶対パスを指定します。

Linux版は手動更新です。アプリを終了して新しいアーカイブを別フォルダーに展開し、
起動確認後に古いフォルダーを削除します。API認証情報・設定はアプリとは別の
ユーザー設定フォルダーに保存されます。実機での起動、サンドボックス、ライブラリー、
描画・入力、API通信、スリープ復帰の確認を終えるまでは、実機動作確認済みとは扱いません。
