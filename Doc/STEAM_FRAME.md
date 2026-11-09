# Steam Frame desktop / Steam Frame デスクトップ

**Draft / 実機未検証:** Steam Frameでの起動・サンドボックス・描画・入力・API操作は未確認です。
This is experimental Linux ARM64 desktop support, not a Steam Frame Verified claim.

## Trusted downloads / 配布元の確認

Normal use should start from a maintainer-approved release, or an explicitly
reviewed build produced by the **original `0suu/SwitchBotController` repository's
`main` branch**. Confirm the repository, source revision, and architecture. This
PR does not publish a release or designate its fork/PR artifacts as approved.
A green CI result or a matching checksum proves neither that code is safe nor
that a build has been approved.

For testing this draft, use only the exact reviewed source SHA identified in the
PR description, with a test account rather than production API credentials.
Do not choose an arbitrary successful branch/fork run. In GitHub Actions, a
`pull_request` run can build a synthetic merge commit: the actual `buildCommit`
and the PR's `pullRequestHeadCommit` are recorded separately in
`resources/build-info.json`. `workingTreeDirty` identifies uncommitted local
source changes. Check the run's provenance against the intended reviewed source;
these fields are traceability information, not a security endorsement.

Actions artifacts require GitHub sign-in and are retained for **7 days**. They
are temporary test downloads, not permanent release links. The workflow runs on
PRs, `main`/`develop` pushes, and manual dispatch, with superseded runs cancelled.

通常利用では、承認済みリリース、または元リポジトリ `0suu/SwitchBotController`
の `main` から作られ、対象コミットが明示的にレビューされたビルドを使ってください。
このdraft PRのフォーク／PR成果物は承認済みリリースではありません。検証する場合も
PR説明に記載されたレビュー対象SHAとビルド元を照合し、本番API認証情報を入力しないでください。

## Easy installation / 簡単な導入

1. Download the appropriate **Linux ARM64** artifact ZIP from the trusted source
   above, then unzip it. The ZIP contains a `.run` installer and a portable
   `.tar.gz` fallback. Downloading and unzipping the Actions ZIP are still required.
2. In KDE Dolphin, open Konsole in that folder and run the downloaded installer
   as your normal desktop user (adjust the version in the filename if needed):

   ```sh
   sh ./switchbot-controller-1.3.2-linux-arm64.run
   ```

3. Open **SwitchBot Controller** in the normal application menu. Its icon is
   installed automatically; no manual KDE menu editing is needed. You can then
   delete the downloaded ZIP, `.run`, and `.tar.gz`: the app does not run from
   Downloads. If a menu has not refreshed immediately, reopen it or log in again.

The installer does not start the app, add autostart, or send device commands.
It installs only in user-owned paths:

- Application versions: `${XDG_DATA_HOME:-~/.local/share}/switchbot-controller/versions/`.
- Stable executable link: `~/.local/bin/switchbot-controller`.
- Application menu entry: `${XDG_DATA_HOME:-~/.local/share}/applications/switchbot-controller.desktop`.
- Menu and window icon: the packaged 512px PNG under the selected installed version.

No Node/npm, FUSE, Proton, sudo, read-only-system changes, or sandbox bypass is
required by the installation process. A compatible desktop/runtime and working
sandbox are still necessary to **run** the app; see troubleshooting below.
The default install respects `XDG_DATA_HOME`. `--prefix /absolute/path` overrides
both binary and data locations for advanced use/testing; a custom prefix's menu
entry will only appear if the desktop searches that prefix's `share` directory.
Symlinked installation paths, control characters, or unrelated pre-existing
files/directories are refused rather than overwritten. Use a real user-owned
path if your preferred destination is a symlink.

ZIPを展開し、Konsoleで上記の `sh ...run` を一度実行すれば、アプリの配置・アイコン・
メニュー登録まで行います。以後はアプリメニューから起動でき、Downloadsの配布物を
残す必要はありません。インストーラーはアプリの自動起動やデバイス操作を行いません。

## Updates, rollback, and credentials

Linux archive installs use **manual updates**. **Quit the app before an update or rollback**; the installer does not stop a running app for you.
更新・巻き戻しの前にアプリを終了してください。インストーラーは実行中のアプリを停止しません。

Run a newer trusted `.run` with
exactly the same destination settings. The payload and icon are checked before
activation; a version pointer is then replaced atomically. An ordinary failed
update leaves the previous working launcher intact. Reinstalling the same payload
is supported. The previous version is retained, and can be selected with:

```sh
sh ./switchbot-controller-1.3.2-linux-arm64.run --rollback
```

Old version folders are intentionally not deleted automatically. An interrupted
installer can leave its empty `.install-lock` directory; follow the explicit
`rmdir` message only after confirming no installer is running. Do not remove
another process's lock. Rerun the same or a newer installer to settle an
interrupted switch. If the current version is damaged, select a usable previous
version with `--rollback` or install a newer payload.

Settings/token files are outside these installation paths, normally
`~/.config/switchbot-controller/switchbot-controller-config.json` (or under
`XDG_CONFIG_HOME`). The installer never reads, migrates, deletes, or changes them.
The app itself retains its existing settings behavior, including plaintext local
credentials and the old-version migration. Do not attach config files to reports.
Only enter credentials after you have decided to trust the specific application
build. Windows/macOS updater behavior is retained. Running from source shows
that automatic updates are unavailable, rather than Linux installation guidance.

## Portable fallback and runtime troubleshooting

Extract the `.tar.gz` into a permanent user-owned folder, keep its contents
together, and run `./switchbot-controller` there. This fallback does not register
a menu entry. The PNG is still present and used by the Linux app window.

Valve documents Steam Frame as **ARM64**, with Arch-based SteamOS 3 and KDE
Plasma. This build is a native desktop app, not a VR overlay. Steam Deck's x64
builds are a different architecture. Sources: [Valve specifications](https://store.steampowered.com/hardware/steamframe),
[Valve compatibility guidance](https://partner.steamgames.com/doc/steamhardware/steamframe/compatibility).

The bundle includes Electron/Node but is not a static Linux executable. It
requires compatible ARM64 glibc, GTK 3/GLib, NSS/NSPR, ATK, CUPS, D-Bus, ALSA,
GBM/DRM and X11/XCB libraries, plus a desktop session. KDE's XWayland supports the
normal X11 path. The installed menu entry is named `switchbot-controller.desktop`; the Linux
window icon points to the bundled PNG. No optional `StartupWMClass` hint or
unsupported `app.setDesktopName` call is added. Actual window grouping, taskbar
icon resolution, and Wayland app-id behavior remain unverified until a GUI run
can observe them.

- Wrong architecture: check `uname -m` says `aarch64`/`arm64`; do not use an x64 or macOS bundle.
- Permission denied: install on a writable, executable local filesystem; `noexec` mounts cannot run it.
- Missing libraries: inspect `ldd` on the installed executable and report `not found` entries and the SteamOS version. Do not replace SteamOS system libraries.
- No display: start from a logged-in KDE desktop, not headless SSH. If needed, try the portable binary with `--ozone-platform=wayland` and report the result separately.
- Sandbox failure: the user-space install does not install a setuid-root helper. Chromium needs working unprivileged user namespaces. If the existing host policy blocks them, report the exact error; do not use `--no-sandbox`, sudo, or weaken host policy. [Electron sandbox documentation](https://www.electronjs.org/docs/latest/tutorial/sandbox).

The app uses the SwitchBot Cloud API at `api.switch-bot.com`, not local Bluetooth.
Desktop pointer/keyboard input is required; no native VR controller mapping is provided.

## Build and validation

On a development machine with Node.js 22 and npm:

```sh
npm ci
npm test -- --runInBand
npm run test:linux-installer
npm run package:linux:arm64
```

The packaging command never publishes. It produces both `.run` and `.tar.gz`
in `release/`, records the actual build commit, and bundles the existing licenses
and icon. The native Linux ARM64 workflow checks installer fixtures, desktop-entry
parsing, package contents, and attempts an installed-launcher GUI smoke test using
an isolated temporary home/config. GUI evidence records **passed**, **blocked**,
or **failed**, including the exact host/tool/library limitation. It never changes
host sandbox policy. A successful packaging job does not by itself establish a
successful GUI launch. Xvfb/X11 CI is not KDE, Wayland, or Steam Frame hardware.

Before calling this supported on a Steam Frame, record the exact source/artifact,
SteamOS version, desktop session type, and any launch flags, then verify:

- Sandbox-enabled launch from the installed menu, matching taskbar/window icon,
  keyboard/pointer input, both languages, theme, and an absence of runtime errors.
- First launch with an empty temporary profile, using the portable fallback if
  convenient: `XDG_CONFIG_HOME="$(mktemp -d)" ./switchbot-controller`. Confirm the
  logged config path is inside that directory before proceeding.
- With an explicitly selected test account/device: credential persistence,
  device/scene retrieval, and a safe chosen control action. No live-device command
  belongs in unattended CI.
- Manual update, failed update, rollback, and unchanged saved settings.
- Suspend/resume and network loss/reconnection; default X11/XWayland first, then
  any Wayland-specific test separately.
