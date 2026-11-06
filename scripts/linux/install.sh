#!/bin/sh
# Self-contained Linux ARM64 installer. The build appends the checked tar.gz.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail
umask 077

payload_sha='@PAYLOAD_SHA256@'
icon_sha='@ICON_SHA256@'
archive_root='@ARCHIVE_ROOT@'
app_id='switchbot-controller'
build_commit='@BUILD_COMMIT@'
source_dirty='@SOURCE_DIRTY@'
prefix="${HOME:?HOME is not set}/.local"
data_base="${XDG_DATA_HOME:-$prefix/share}"
rollback=false

fail() { printf 'Install failed: %s\n' "$*" >&2; exit 1; }
usage() {
  printf '%s\n' 'Install SwitchBot Controller for the current user (Linux ARM64).' \
    'Usage: sh installer.run [--prefix /absolute/user-owned/path] [--rollback]' \
    'Default: ~/.local/bin and ${XDG_DATA_HOME:-~/.local/share}.' \
    'Does not start the app, alter its saved settings, or install an autostart entry.'
}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --prefix)
      [ "$#" -ge 2 ] || fail '--prefix needs an absolute directory'
      prefix=$2; data_base="$prefix/share"; shift 2 ;;
    --rollback) rollback=true; shift ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[ "$(uname -s)" = Linux ] || fail 'This installer requires Linux.'
case "$(uname -m)" in aarch64|arm64) ;; *) fail 'This build requires ARM64 (aarch64), not x64.' ;; esac
[ "$(id -u)" != 0 ] || fail 'Run as your normal desktop user, without sudo.'
for command_name in tar tail awk sha256sum mktemp mv ln readlink grep; do
  command -v "$command_name" >/dev/null || fail "Missing command: $command_name"
done

# Reject ambiguous desktop-entry paths and symlink redirects, including parents.
check_path() {
  local value=$1 component current=''
  local -a components
  case "$value" in /*) ;; *) fail "Path must be absolute: $value" ;; esac
  case "$value" in *$'\n'*|*$'\r'*|*$'\t'*) fail 'Installation paths cannot contain control characters.' ;; esac
  IFS=/ read -r -a components <<< "$value"
  for component in "${components[@]}"; do
    [ -n "$component" ] || continue
    case "$component" in .|..) fail 'Installation paths cannot contain . or .. components.' ;; esac
    current="$current/$component"
    [ ! -L "$current" ] || fail "Refusing symlink directory: $current"
  done
}
ensure_directory() {
  check_path "$1"
  if [ -e "$1" ]; then
    [ -d "$1" ] && [ -O "$1" ] || fail "Not a user-owned directory: $1"
  else
    mkdir -p -- "$1"
    [ -O "$1" ] || fail "Not a user-owned directory: $1"
  fi
}

while [ "${prefix%/}" != "$prefix" ]; do prefix=${prefix%/}; done
while [ "${data_base%/}" != "$data_base" ]; do data_base=${data_base%/}; done
check_path "$prefix"; check_path "$data_base"
root="$data_base/$app_id"
bin_dir="$prefix/bin"
applications="$data_base/applications"
bin_path="$bin_dir/$app_id"
desktop_path="$applications/$app_id.desktop"
bin_target="$root/current/$app_id"
desktop_target="$root/current/$app_id.desktop"

check_root() {
  [ ! -L "$root" ] || fail "Refusing symlink application directory: $root"
  if [ -e "$root" ]; then
    [ -d "$root" ] && [ -O "$root" ] || fail "Not a user-owned application directory: $root"
    [ -f "$root/.installer-v1" ] && [ ! -L "$root/.installer-v1" ] && [ -O "$root/.installer-v1" ] \
      && [ "$(cat "$root/.installer-v1")" = "$app_id" ] || fail "Refusing unrelated existing directory: $root"
  elif "$rollback"; then
    fail 'No installation to roll back.'
  fi
}
check_link() {
  if [ -e "$1" ] || [ -L "$1" ]; then
    [ -L "$1" ] && [ -O "$1" ] && [ "$(readlink "$1")" = "$2" ] \
      || fail "Refusing unrelated existing launcher: $1"
  fi
}
check_root
check_path "$bin_dir"; check_path "$applications"
check_link "$bin_path" "$bin_target"
check_link "$desktop_path" "$desktop_target"
ensure_directory "$data_base"
stage=$(mktemp -d "$data_base/.switchbot-install.XXXXXXXX")
locked=false
created_bin=false
created_desktop=false
success=false
previous_changed=false
old_previous=
old_current=
pointer_sequence=0
cleanup() {
  set +e
  if ! "$success"; then
    if "$previous_changed"; then
      if [ -n "$old_previous" ]; then
        ln -s -- "$old_previous" "$stage/restore-previous" && mv -Tf -- "$stage/restore-previous" "$root/previous"
      elif [ -L "$root/previous" ] && [ "$(readlink "$root/previous")" = "$old_current" ]; then
        rm -- "$root/previous"
      fi
    fi
    if "$created_bin" && [ -L "$bin_path" ] && [ "$(readlink "$bin_path")" = "$bin_target" ]; then rm -- "$bin_path"; fi
    if "$created_desktop" && [ -L "$desktop_path" ] && [ "$(readlink "$desktop_path")" = "$desktop_target" ]; then rm -- "$desktop_path"; fi
  fi
  if "$locked"; then rmdir -- "$root/.install-lock"; fi
  # Only remove this invocation's newly-created staging directory.
  rm -rf -- "$stage"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! "$rollback"; then
  payload_line=$(awk '/^__SWITCHBOT_PAYLOAD__$/ { print NR + 1; exit }' "$0")
  [ -n "$payload_line" ] || fail 'Missing embedded payload.'
  tail -n +"$payload_line" -- "$0" > "$stage/payload.tar.gz"
  [ "$(sha256sum "$stage/payload.tar.gz" | awk '{print $1}')" = "$payload_sha" ] || fail 'Payload checksum mismatch.'
  tar -tzf "$stage/payload.tar.gz" > "$stage/entries"
  while IFS= read -r entry; do
    case "$entry" in "$archive_root/"|"$archive_root/"*) ;; *) fail "Unexpected archive entry: $entry" ;; esac
    case "/$entry/" in */../*|*/./*) fail 'Unsafe archive path.' ;; esac
  done < "$stage/entries"
  tar -tvzf "$stage/payload.tar.gz" > "$stage/types"
  if grep -qv '^[-d]' "$stage/types"; then fail 'Archive links or special files are not allowed.'; fi
  mkdir -- "$stage/unpacked"
  tar --no-same-owner --no-same-permissions -xzf "$stage/payload.tar.gz" -C "$stage/unpacked"
  bundle="$stage/unpacked/$archive_root"
  [ -f "$bundle/$app_id" ] && [ -x "$bundle/$app_id" ] && [ -f "$bundle/resources/app.asar" ] \
    && [ -f "$bundle/resources/icon.png" ] || fail 'Incomplete application payload.'
  [ "$(sha256sum "$bundle/resources/icon.png" | awk '{print $1}')" = "$icon_sha" ] || fail 'Packaged icon checksum mismatch.'
fi

check_root
if [ ! -d "$root" ]; then
  mkdir -- "$root"
  printf '%s\n' "$app_id" > "$root/.installer-v1"
fi
mkdir -- "$root/.install-lock" || fail "Another installer may be running. If none is running, remove the empty lock with: rmdir '$root/.install-lock'"
locked=true
ensure_directory "$root/versions"
ensure_directory "$bin_dir"
ensure_directory "$applications"
check_link "$bin_path" "$bin_target"
check_link "$desktop_path" "$desktop_target"

validate_version() {
  local target=$1 directory="$root/$1"
  [[ "$target" =~ ^versions/[0-9a-f]{64}$ ]] || fail 'Unrecognized installed version link.'
  [ -d "$directory" ] && [ ! -L "$directory" ] && [ -O "$directory" ] \
    && [ -f "$directory/.payload-sha256" ] && [ ! -L "$directory/.payload-sha256" ] \
    && [ "$(cat "$directory/.payload-sha256")" = "${target#versions/}" ] \
    && [ -f "$directory/.icon-sha256" ] && [ ! -L "$directory/.icon-sha256" ] \
    && [ -f "$directory/$app_id" ] && [ ! -L "$directory/$app_id" ] && [ -x "$directory/$app_id" ] \
    && [ -f "$directory/resources/app.asar" ] && [ ! -L "$directory/resources/app.asar" ] \
    && [ -f "$directory/resources/icon.png" ] && [ ! -L "$directory/resources/icon.png" ] \
    && [ -f "$directory/$app_id.desktop" ] && [ ! -L "$directory/$app_id.desktop" ] \
    || fail "Unrecognized or incomplete installed version: $directory"
  [ "$(sha256sum "$directory/resources/icon.png" | awk '{print $1}')" = "$(cat "$directory/.icon-sha256")" ] \
    || fail "Installed icon checksum mismatch: $directory"
}
read_version_link() {
  local location=$1
  if [ -L "$location" ]; then
    local target
    target=$(readlink "$location")
    validate_version "$target"
    printf '%s' "$target"
  elif [ -e "$location" ]; then
    fail "Refusing unrelated existing version pointer: $location"
  fi
}
old_current=$(read_version_link "$root/current")
old_previous=$(read_version_link "$root/previous")

# Escape the Desktop Entry string layer after the Exec argument quoting layer.
# No path is ever evaluated by a shell in the generated desktop entry.
desktop_value() { local value=$1; value=${value//\\/\\\\}; printf '%s' "$value"; }
desktop_exec() {
  local value=$1
  value=${value//\\/\\\\}; value=${value//\"/\\\"}
  value=${value//\`/\\\`}; value=${value//\$/\\\$}; value=${value//%/%%}
  desktop_value "\"$value\""
}
if "$rollback"; then
  [ -n "$old_current" ] && [ -n "$old_previous" ] || fail 'No previous version to roll back to.'
  next=$old_previous
else
  next="versions/$payload_sha"
  if [ -e "$root/$next" ] || [ -L "$root/$next" ]; then
    validate_version "$next"
  else
    {
      printf '%s\n' '[Desktop Entry]' 'Type=Application' 'Name=SwitchBot Controller' 'Comment=Control SwitchBot devices using the Cloud API'
      printf 'Exec=%s\n' "$(desktop_exec "$bin_path")"
      printf 'Icon=%s\n' "$(desktop_value "$root/current/resources/icon.png")"
      printf '%s\n' 'Terminal=false' 'Categories=Utility;' 'StartupWMClass=switchbot-controller'
    } > "$bundle/$app_id.desktop"
    printf '%s\n' "$payload_sha" > "$bundle/.payload-sha256"
    printf '%s\n' "$icon_sha" > "$bundle/.icon-sha256"
    mv -- "$bundle" "$root/$next"
    validate_version "$next"
  fi
fi

if [ ! -L "$bin_path" ]; then ln -s -- "$bin_target" "$bin_path"; created_bin=true; fi
if [ ! -L "$desktop_path" ]; then ln -s -- "$desktop_target" "$desktop_path"; created_desktop=true; fi
atomic_link() {
  pointer_sequence=$((pointer_sequence + 1))
  ln -s -- "$1" "$stage/pointer.$pointer_sequence"
  # GNU mv -T replaces the link itself, never a directory reached through it.
  mv -Tf -- "$stage/pointer.$pointer_sequence" "$2"
}
if [ "$old_current" != "$next" ]; then
  if [ -n "$old_current" ]; then
    atomic_link "$old_current" "$root/previous"
    previous_changed=true
  fi
  atomic_link "$next" "$root/current"
fi
success=true
printf 'Installed. Open "SwitchBot Controller" from your application menu.\nLauncher: %s\n' "$bin_path"
printf 'Installer build commit: %s (uncommitted source changes: %s). This is provenance, not a safety approval.\n' "$build_commit" "$source_dirty"
printf 'Installed app provenance: %s\n' "$root/current/resources/build-info.json"
printf 'You can delete the downloaded installer. Settings and credentials were not changed.\n'
exit 0
__SWITCHBOT_PAYLOAD__
