import SwiftUI
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Ensure the app is a regular foreground app so the window can accept keyboard input.
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}

@main
struct KuliApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("Kuli Server") {
            ContentView()
                .frame(minWidth: 480, minHeight: 420)
        }
    }
}

final class ServerController: ObservableObject {
    @Published var running = false
    @Published var status = "Stopped"
    @Published var log = ""
    private var process: Process?
    private var pipe: Pipe?

    func start(port: Int, transcriptWorkers: Int) {
        guard !running else { return }
        let binURL: URL
        if let bundled = Bundle.main.url(forResource: "kuli-server", withExtension: nil, subdirectory: "server") {
            binURL = bundled
        } else {
            // Dev fallback: run the PyInstaller output from the repo's dist/ dir
            let dev = URL(fileURLWithPath: "dist/kuli-server/kuli-server")
            guard FileManager.default.isExecutableFile(atPath: dev.path) else {
                status = "Error: server binary not found (bundle or dist/kuli-server/)"
                return
            }
            binURL = dev
        }
        log = "Starting server binary at \(binURL.path)\nPort: \(port)\nTranscript workers: \(transcriptWorkers)\n"
        let proc = Process()
        proc.executableURL = binURL
        proc.arguments = [String(port)]
        proc.environment = [
            "PYTHONUNBUFFERED": "1",
            "TRANSCRIBE_EXECUTOR": "process",
            "TRANSCRIBE_MAX_WORKERS": String(transcriptWorkers)
        ]

        let outPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = outPipe
        outPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async { self?.log += text }
        }

        proc.terminationHandler = { [weak self] proc in
            DispatchQueue.main.async {
                self?.running = false
                self?.status = proc.terminationStatus == 0 ? "Stopped" : "Stopped with error code \(proc.terminationStatus)"
                self?.log += "\nProcess exited with code \(proc.terminationStatus)\n"
            }
        }
        do {
            log += "Launching process...\n"
            try proc.run()
            process = proc
            pipe = outPipe
            running = true
            log += "Process started with PID \(proc.processIdentifier). Waiting for FastAPI startup logs...\n"
            status = "Starting server at http://127.0.0.1:\(port)..."
        } catch {
            status = "Error: \(error.localizedDescription)"
        }
    }

    func stop() {
        pipe?.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        pipe = nil
        running = false
        status = "Stopped"
    }

    func killPort(_ port: Int) {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/bin/zsh")
        proc.arguments = ["-lc", "pids=$(lsof -ti tcp:\(port)); if [ -n \"$pids\" ]; then kill -9 $pids; else exit 1; fi"]

        do {
            try proc.run()
            proc.waitUntilExit()
            status = proc.terminationStatus == 0 ? "Killed processes on port \(port)" : "No process found on port \(port)"
        } catch {
            status = "Error: \(error.localizedDescription)"
        }
    }
}

struct ContentView: View {
    @StateObject private var server = ServerController()
    @AppStorage("port") private var portText = "8000"
    @AppStorage("transcriptWorkers") private var transcriptWorkersText = "4"
    @State private var installStatus = ""

    private func installExtension() {
        let fm = FileManager.default

        // Built extension files: bundled resource, or dev fallback to repo dist/extensions
        let src: URL
        if let bundled = Bundle.main.url(forResource: "extensions", withExtension: nil, subdirectory: "dist") {
            src = bundled
        } else {
            let dev = URL(fileURLWithPath: "dist/extensions")
            guard fm.fileExists(atPath: dev.path) else {
                installStatus = "Error: built extensions not found (build first)"
                return
            }
            src = dev
        }

        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Install Here"
        panel.message = "Choose where to install the extension"
        guard panel.runModal() == .OK, let chosen = panel.url else { return }
        let destDir = chosen.appendingPathComponent("kuli-extensions", isDirectory: true)

        do {
            try fm.createDirectory(at: destDir, withIntermediateDirectories: true)
            let names = try fm.contentsOfDirectory(atPath: src.path)
            for name in names {
                let target = destDir.appendingPathComponent(name)
                if fm.fileExists(atPath: target.path) { try fm.removeItem(at: target) }
                try fm.copyItem(at: src.appendingPathComponent(name), to: target)
            }
            installStatus = "Installed \(names.count) items to \(destDir.path)"
        } catch {
            installStatus = "Error: \(error.localizedDescription)"
        }
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.1"
    }

    var body: some View {
        VStack(spacing: 14) {
            Text("Kuli Server v\(appVersion)").font(.title2).bold()

            HStack {
                Text("Port")
                TextField("8000", text: $portText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 100)
                    .disabled(server.running)

                Text("Transcript processes")
                TextField("4", text: $transcriptWorkersText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 60)
                    .disabled(server.running)

                Button(server.running ? "Stop" : "Start") {
                    if server.running {
                        server.stop()
                    } else if let port = Int(portText), (1...65535).contains(port),
                              let workers = Int(transcriptWorkersText), (1...32).contains(workers) {
                        server.start(port: port, transcriptWorkers: workers)
                    } else {
                        server.status = "Error: invalid port or transcript processes"
                    }
                }
                .buttonStyle(.borderedProminent)

                Button("Kill Port") {
                    if let port = Int(portText), (1...65535).contains(port) {
                        server.killPort(port)
                    } else {
                        server.status = "Error: invalid port"
                    }
                }
                .disabled(server.running)
            }

            Text(server.status)
                .font(.callout)
                .foregroundStyle(server.running ? .green : .secondary)
                .textSelection(.enabled)
                .multilineTextAlignment(.center)

            Divider()

            HStack {
                Button("Install Extension…", action: installExtension)
                if !installStatus.isEmpty {
                    Text(installStatus)
                        .font(.caption)
                        .foregroundStyle(installStatus.hasPrefix("Error") ? .red : .secondary)
                        .textSelection(.enabled)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
            Text("Logs").font(.headline).frame(maxWidth: .infinity, alignment: .leading)

            ScrollViewReader { proxy in
                ScrollView {
                    Text(server.log.isEmpty ? "No output yet." : server.log)
                        .font(.system(.caption, design: .monospaced))
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                        .id("logEnd")
                }
                .background(Color(nsColor: .textBackgroundColor))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(.secondary.opacity(0.3)))
                .onChange(of: server.log) { _, _ in
                    proxy.scrollTo("logEnd", anchor: .bottom)
                }
            }
        }
        .padding(20)
    }
}
