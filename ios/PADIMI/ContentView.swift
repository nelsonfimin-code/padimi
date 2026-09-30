import SwiftUI

struct ContentView: View {
    @State private var copied = false
    private let keyboardName = "PADIMI"
    private let backend = "https://padimi-production.up.railway.app"

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 22) {
                Text("PADIMI").font(.system(size: 14, weight: .semibold)).tracking(5)
                Text("Write it. Refine it. Keep your voice.").font(.system(size: 30, weight: .regular)).fixedSize(horizontal: false, vertical: true)
                Text("PADIMI also works as an iPhone keyboard, so you can refine text inside Messages, Mail, Notes and other apps.").foregroundStyle(.secondary)
                Divider()
                Label("Install the keyboard", systemImage: "keyboard")
                    .font(.headline)
                Text("Settings → General → Keyboard → Keyboards → Add New Keyboard → PADIMI. Then tap PADIMI and turn on Allow Full Access.")
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button("Copy backend address") {
                    UIPasteboard.general.string = backend
                    copied = true
                }
                .buttonStyle(.borderedProminent)
                if copied { Text("Copied").font(.caption).foregroundStyle(.secondary) }
                Spacer()
            }
            .padding(24)
            .navigationTitle(keyboardName)
        }
    }
}
