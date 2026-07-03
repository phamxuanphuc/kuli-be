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

    func start(port: Int) {
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
        log = ""
        let proc = Process()
        proc.executableURL = binURL
        proc.arguments = [String(port)]
        proc.environment = ["PYTHONUNBUFFERED": "1"]

        let outPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = outPipe
        outPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async { self?.log += text }
        }

        proc.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.running = false
                self?.status = "Stopped"
            }
        }
        do {
            try proc.run()
            process = proc
            pipe = outPipe
            running = true
            status = "Running at http://127.0.0.1:\(port) (first launch may take ~15s to be ready)"
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
}

struct ContentView: View {
    @StateObject private var server = ServerController()
    @AppStorage("port") private var portText = "8000"

    var body: some View {
        VStack(spacing: 14) {
            Text("Kuli Server").font(.title2).bold()

            HStack {
                Text("Port")
                TextField("8000", text: $portText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 100)
                    .disabled(server.running)

                Button(server.running ? "Stop" : "Start") {
                    if server.running {
                        server.stop()
                    } else if let port = Int(portText), (1...65535).contains(port) {
                        server.start(port: port)
                    } else {
                        server.status = "Error: invalid port"
                    }
                }
                .buttonStyle(.borderedProminent)
            }

            Text(server.status)
                .font(.callout)
                .foregroundStyle(server.running ? .green : .secondary)
                .textSelection(.enabled)
                .multilineTextAlignment(.center)

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
