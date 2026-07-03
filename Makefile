VENV := .venv-app
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.PHONY: setup server-bin build dmg dev dev-ext build-ext clean

setup:
	python3 -m venv $(VENV)
	$(PIP) install -r requirements-app.txt

server-bin:
	$(VENV)/bin/pyinstaller --noconfirm --onedir --name kuli-server \
		--collect-all markitdown --collect-all magika \
		--exclude-module torch --exclude-module moonshine_voice \
		--exclude-module tkinter --exclude-module matplotlib \
		server_entry.py

build: server-bin
	./macapp/build.sh

# Rebuild extensions with latest code, then package the .app + .dmg
dmg: build-ext build

dev:
	./macapp/dev.sh

dev-ext:
	cd extensions && pnpm dev

build-ext:
	cd extensions && pnpm build

clean:
	rm -rf build dist $(VENV)
