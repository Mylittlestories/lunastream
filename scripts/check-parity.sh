#!/usr/bin/env bash
# GUARANTEE: fixes must apply to ALL platforms. The Android Mobile and TV
# torrent engines must stay identical (modulo package name). If they drift,
# a platform silently misses fixes - this check fails the build instead.
set -euo pipefail
cd "$(dirname "$0")/.."

MOBILE="android-mobile/app/src/main/java/com/lunastream/app/LunaTorrentManager.java"
TV="android-tv/app/src/main/java/com/lunastream/tv/LunaTorrentManager.java"

strip_pkg() { grep -vE "^package |^import com\.lunastream\.(app|tv)\." "$1"; }

if ! diff <(strip_pkg "$MOBILE") <(strip_pkg "$TV") > /dev/null; then
  echo "PARITY FAILURE: LunaTorrentManager.java differs between android-mobile and android-tv."
  echo "Every fix MUST apply to both. Diff:"
  diff <(strip_pkg "$MOBILE") <(strip_pkg "$TV") | head -40
  exit 1
fi
echo "Parity check OK: android-mobile and android-tv engines are identical (modulo package)."
