#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP="dist/Kuli.app"
BIN="dist/kuli-server"   # PyInstaller onedir output

if [ ! -d "$BIN" ]; then
  echo "Build the Python server first:"
  echo "  .venv-app/bin/pyinstaller --noconfirm --onedir --name kuli-server --collect-all markitdown --collect-all magika --exclude-module torch --exclude-module moonshine_voice --exclude-module tkinter --exclude-module matplotlib server_entry.py"
  exit 1
fi

if [ ! -d "dist/extensions" ]; then
  echo "Build the extensions first (pnpm build in extensions/), output must be at dist/extensions"
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/server" "$APP/Contents/Resources/dist"

# Compile SwiftUI native binary
swiftc -O -parse-as-library -o "$APP/Contents/MacOS/Kuli" macapp/KuliApp.swift \
  -framework SwiftUI -framework AppKit

# Bundle the PyInstaller server dir into Resources/server
cp -R "$BIN/." "$APP/Contents/Resources/server/"

# Bundle the built extensions into Resources/dist/extensions (for the Install button)
cp -R "dist/extensions" "$APP/Contents/Resources/dist/extensions"

# App icon
cp macapp/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Kuli</string>
  <key>CFBundleDisplayName</key><string>Kuli Server</string>
  <key>CFBundleIdentifier</key><string>com.kuli.server</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Kuli</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# Ad-hoc sign so Gatekeeper on other Macs can run it after right-click > Open
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo "Built $APP"

# Package into a distributable DMG (drag-to-Applications layout)
DMG="dist/Kuli.dmg"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "Kuli" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"

echo "Built $DMG"
