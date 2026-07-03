#!/bin/bash
# Fast UI dev loop: compile the SwiftUI app and run it directly (no .app bundle).
# The server binary is loaded from dist/kuli-server/ (build it once with PyInstaller).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x "dist/kuli-server/kuli-server" ]; then
  echo "Build the server binary once first (see macapp/README.md), then re-run."
  exit 1
fi

BIN="$(mktemp -d)/Kuli"
swiftc -parse-as-library -o "$BIN" macapp/KuliApp.swift -framework SwiftUI -framework AppKit
echo "Running $BIN"
"$BIN"
