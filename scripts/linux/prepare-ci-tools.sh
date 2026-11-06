#!/bin/bash
set -euo pipefail
# Extract missing test tools/libraries into runner-owned storage. No sudo,
# package-manager installation, sandbox changes, or writes to the system image.
tools_root="$RUNNER_TEMP/switchbot-desktop-tools"
mkdir -p "$tools_root/debs" "$tools_root/root"
cd "$tools_root/debs"
for package in desktop-file-utils xvfb x11-utils x11-apps libxfont2 libxmu6 libxmuu1 libxaw7 libxpm4 libxcb-shape0 \
  libgtk-3-0t64 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libcups2t64 \
  libnss3 libnspr4 libgbm1 libdrm2 libxkbcommon0; do
  if [ "$(dpkg-query -W -f='${Status}' "$package" 2>/dev/null || true)" != 'install ok installed' ]; then
    apt-get download "$package"
  fi
done
for archive in ./*.deb; do
  [ -f "$archive" ] || continue
  dpkg-deb -x "$archive" "$tools_root/root"
done
printf '%s\n' "$tools_root/root/usr/bin" >> "$GITHUB_PATH"
printf 'LD_LIBRARY_PATH=%s\n' "$tools_root/root/usr/lib/aarch64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" >> "$GITHUB_ENV"
