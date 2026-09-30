import UIKit

final class PADIMIKeyboardViewController: UIInputViewController {
    private let endpoint = URL(string: "https://padimi-production.up.railway.app/api/refine")!
    private var tone = "neutral"
    private var mode = "natural"
    private var instruction = ""
    private let status = UILabel()
    private let instructionField = UITextField()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.10, green: 0.09, blue: 0.11, alpha: 1)
        buildUI()
    }

    private func buildUI() {
        let stack = UIStackView(); stack.axis = .vertical; stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 10),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -10),
            stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            stack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8)
        ])

        let top = UIStackView(); top.axis = .horizontal; top.distribution = .fillEqually; top.spacing = 6
        for (title, value) in [("Clear", "clear"), ("Natural", "natural"), ("Strong", "strong")] {
            let b = UIButton(type: .system); b.setTitle(title, for: .normal); b.tag = value == "clear" ? 1 : value == "strong" ? 3 : 2
            b.addTarget(self, action: #selector(modeTapped(_:)), for: .touchUpInside)
            b.backgroundColor = UIColor.white.withAlphaComponent(0.06); b.layer.cornerRadius = 8
            top.addArrangedSubview(b)
        }
        stack.addArrangedSubview(top)

        let controls = UIStackView(); controls.axis = .horizontal; controls.spacing = 6
        instructionField.placeholder = "shorter, warmer…"; instructionField.textColor = .white; instructionField.tintColor = .systemPurple
        instructionField.backgroundColor = UIColor.white.withAlphaComponent(0.06); instructionField.layer.cornerRadius = 8
        instructionField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 8, height: 1)); instructionField.leftViewMode = .always
        controls.addArrangedSubview(instructionField)
        let refine = UIButton(type: .system); refine.setTitle("Refine", for: .normal); refine.titleLabel?.font = .boldSystemFont(ofSize: 13)
        refine.backgroundColor = .white; refine.setTitleColor(.black, for: .normal); refine.layer.cornerRadius = 8
        refine.addTarget(self, action: #selector(refineTapped), for: .touchUpInside); controls.addArrangedSubview(refine)
        stack.addArrangedSubview(controls)

        let toneButton = UIButton(type: .system); toneButton.setTitle("Tone: Neutral", for: .normal); toneButton.addTarget(self, action: #selector(toneTapped), for: .touchUpInside)
        stack.addArrangedSubview(toneButton)
        status.text = "Select text or place the cursor after the text you want to refine."; status.textColor = .secondaryLabel; status.font = .systemFont(ofSize: 11); status.numberOfLines = 2
        stack.addArrangedSubview(status)
    }

    @objc private func modeTapped(_ sender: UIButton) {
        mode = sender.tag == 1 ? "clear" : sender.tag == 3 ? "strong" : "natural"
        status.text = "Style: \(mode.capitalized)"
    }

    @objc private func toneTapped() {
        let tones = ["neutral", "professional", "friendly", "casual", "funny", "confident", "polite"]
        tone = tones[(tones.firstIndex(of: tone) ?? 0 + 1) % tones.count]
        status.text = "Tone: \(tone.capitalized)"
    }

    @objc private func refineTapped() {
        let proxy = textDocumentProxy
        guard let context = proxy.documentContextBeforeInput, !context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            status.text = "Type something first."
            return
        }
        let source = String(context.suffix(800))
        instruction = instructionField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        status.text = "Refining…"
        var request = URLRequest(url: endpoint); request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": source, "mode": mode, "tone": tone, "instruction": instruction])
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            DispatchQueue.main.async {
                guard error == nil, let data, let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let refined = payload["text"] as? String else {
                    self.status.text = "Could not reach PADIMI."
                    return
                }
                for _ in 0..<source.count { self.textDocumentProxy.deleteBackward() }
                self.textDocumentProxy.insertText(refined)
                self.status.text = "Refined"
            }
        }.resume()
    }
}
