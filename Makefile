VENV := .venv-app
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.PHONY: setup server-bin build dmg dev dev-ext build-ext clean

setup:
	test -d $(VENV) || python3 -m venv $(VENV)
	$(PIP) install -r requirements-app.txt

server-bin: setup
	MOONSHINE_DIR="$$($(PY) -c 'import moonshine_voice, pathlib; print(pathlib.Path(moonshine_voice.__file__).parent)')"; \
	MOONSHINE_DIR="$$MOONSHINE_DIR" $(PY) -c 'import os; from pathlib import Path; from moonshine_voice.download import find_model_info, get_components_for_model_info; from moonshine_voice.download_file import download_model; from moonshine_voice.moonshine_api import ModelArch; info = find_model_info("en", ModelArch.BASE); dest = Path(os.environ["MOONSHINE_DIR"]) / "assets" / "base-en"; [download_model(info["download_url"] + "/" + component, str(dest / component)) for component in get_components_for_model_info(info)]'; \
	$(VENV)/bin/pyinstaller --noconfirm --onedir --name kuli-server \
		--collect-all markitdown --collect-all magika \
		--hidden-import moonshine_voice.moonshine_api \
		--hidden-import moonshine_voice.transcriber \
		--hidden-import moonshine_voice.utils \
		--add-data "$$MOONSHINE_DIR/assets:moonshine_voice/assets" \
		--add-binary "$$MOONSHINE_DIR/libmoonshine.dylib:moonshine_voice" \
		--add-binary "$$MOONSHINE_DIR/libonnxruntime.1.23.2.dylib:moonshine_voice" \
		--exclude-module torch \
		--exclude-module tkinter --exclude-module matplotlib \
		server_entry.py

build: server-bin
	./macapp/build.sh

# Rebuild FastAPI server and extensions with latest code, then package the .app + .dmg
dmg: build-ext build

dev: server-bin
	./macapp/dev.sh

dev-ext:
	cd extensions && pnpm dev

build-ext:
	cd extensions && pnpm build

clean:
	rm -rf build dist $(VENV)
