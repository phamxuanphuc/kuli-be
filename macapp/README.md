# Kuli — Native macOS App

SwiftUI app that runs the FastAPI HTML→Markdown server locally. UI has a port field and a Start/Stop button.

## Build

```bash
# 1. Python deps (once)
python3 -m venv .venv-app
.venv-app/bin/pip install -r requirements-app.txt

# 2. Bundle the server into a standalone binary, including base-en model assets
make server-bin

# 3. Build the extensions (once, output must land at dist/extensions)
cd extensions && pnpm install && pnpm build && cd ..

# 4. Build the .app and the distributable .dmg
./macapp/build.sh
```

Output: `dist/Kuli.app` (~113 MB) and `dist/Kuli.dmg` (~47 MB).
The bundled extensions ship inside the app (`Contents/Resources/dist/extensions`) so the in-app **Install extension** button works on other Macs.

## Install on another Mac

Copy `dist/Kuli.dmg`, open it, drag **Kuli** to **Applications**, then right-click the app → **Open** the first time (ad-hoc signed).

## Dev

Fast UI loop — compile & run the SwiftUI app directly, no `.app` bundle:

```bash
./macapp/dev.sh
```

Requires `dist/kuli-server/` built once (PyInstaller step above). The app falls back to that binary when not bundled. Edit `KuliApp.swift`, Ctrl-C, re-run.

Server-only dev (no UI):

```bash
.venv-app/bin/uvicorn app.main:app --reload --port 8000
```

## Run on another Mac

- Same CPU arch only. This build is **arm64** (Apple Silicon). For Intel, rebuild on an Intel Mac.
- The `.app` is ad-hoc signed, so the target Mac must right-click the app → **Open** the first time to bypass Gatekeeper.
- First launch of the server takes ~15s (onnxruntime init). Status shows the URL once started.

## Notes

- Audio/video transcription uses `moonshine-voice`; `make server-bin` downloads and bundles the default `base-en` model assets.
