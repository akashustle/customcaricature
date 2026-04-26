#!/usr/bin/env bash
# ==============================================================================
# Build a Custom Caricature Club Android APK locally.
#
# Prereqs (one-time):
#   - Android Studio installed (auto-installs SDK)
#   - Java 17 (`brew install openjdk@17` on Mac)
#   - Node 20+
#
# Usage:
#   ./scripts/build-apk.sh              # debug APK (unsigned, fastest)
#   ./scripts/build-apk.sh release      # signed release APK
#
# The finished APK ends up at ./build/app-debug.apk or ./build/app-release.apk.
# ==============================================================================
set -euo pipefail

MODE="${1:-debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▸ Installing dependencies"
npm install --no-audit --no-fund

echo "▸ Building web bundle"
npm run build

if [ ! -d "android" ]; then
  echo "▸ Adding Capacitor Android project"
  npx cap add android
fi

echo "▸ Syncing Capacitor"
npx cap sync android

echo "▸ Generating launcher icons & splash"
if [ -d "resources" ]; then
  npx -y @capacitor/assets generate --android || echo "  (skipping — install @capacitor/assets if you want auto-generated icons)"
fi

mkdir -p build

if [ "$MODE" = "release" ]; then
  : "${KEYSTORE_PATH:?Set KEYSTORE_PATH=/path/to/keystore.jks}"
  : "${KEYSTORE_PASSWORD:?Set KEYSTORE_PASSWORD}"
  : "${KEY_ALIAS:?Set KEY_ALIAS}"
  : "${KEY_PASSWORD:?Set KEY_PASSWORD}"

  echo "▸ Building signed release APK"
  cd android
  ./gradlew assembleRelease \
    -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
    -Pandroid.injected.signing.store.password="$KEYSTORE_PASSWORD" \
    -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$KEY_PASSWORD"
  cd ..
  cp android/app/build/outputs/apk/release/app-release.apk build/
  echo "✅ Done → build/app-release.apk"
else
  echo "▸ Building debug APK"
  cd android
  ./gradlew assembleDebug
  cd ..
  cp android/app/build/outputs/apk/debug/app-debug.apk build/
  echo "✅ Done → build/app-debug.apk"
fi

echo
echo "Next: upload the file at build/ to a public URL (GitHub Releases, Supabase"
echo "Storage, etc.) and paste that URL into Admin → App Download page."
