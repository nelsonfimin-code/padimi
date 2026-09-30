import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MODES, TONES, refine, refineLocal } from "./refine.js";
import "./styles.css";

function App() {
  const [stage, setStage] = useState("empty");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("natural");
  const [tone, setTone] = useState("neutral");
  const [instruction, setInstruction] = useState("");
  const [iterationInstruction, setIterationInstruction] = useState("");
  const [result, setResult] = useState("");
  const [resultMode, setResultMode] = useState("natural");
  const [resultTone, setResultTone] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [view, setView] = useState("refined");
  const [nudge, setNudge] = useState(false);
  const areaRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    if (stage === "writing") {
      requestAnimationFrame(() => {
        const el = areaRef.current;
        el?.focus();
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }, [stage]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const trimmed = draft.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      setDraft(text);
      setStage("writing");
      setNudge(false);
    } catch {
      setStage("writing");
      setNudge(true);
    }
  }

  async function refineText(source, nextMode, nextTone, nextInstruction, keepOriginal = true) {
    if (loading) return;
    if (!source.trim()) {
      setNudge(true);
      areaRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      let out;
      try {
        const response = await refine(source, nextMode, nextTone, nextInstruction);
        out = response.text;
        setAiUsed(response.provider === "groq");
      } catch {
        out = refineLocal(source, nextMode);
        setAiUsed(false);
      }
      setResult(out || source.trim());
      setResultMode(nextMode);
      setResultTone(nextTone);
      setView("refined");
      setCopied(false);
      setStage("result");
      if (!keepOriginal) setDraft(source);
    } finally {
      setLoading(false);
    }
  }

  async function doRefine() {
    if (loading) return;
    if (!trimmed) {
      setNudge(true);
      areaRef.current?.focus();
      return;
    }
    return refineText(draft, mode, tone, instruction);
  }

  async function copy() {
    const text = view === "original" ? draft.trim() : result;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
    }
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    }
  }

  async function refineAgain() {
    if (loading) return;
    const nextInstruction = iterationInstruction.trim();
    if (!nextInstruction) return;
    await refineText(result, resultMode, resultTone, nextInstruction);
    setIterationInstruction("");
  }

  function again() {
    setDraft("");
    setResult("");
    setMode("natural");
    setTone("neutral");
    setInstruction("");
    setIterationInstruction("");
    setStage("empty");
  }

  function onKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      doRefine();
    }    if (event.key === "Escape" && !trimmed) setStage("empty");
  }

  const modeLabel = MODES.find((item) => item.id === resultMode)?.label;
  const toneLabel = TONES.find((item) => item.id === resultTone)?.label;

  return (
    <div className="app">
      <div className="glow-field" aria-hidden="true" />
      <div className="shell">
        <header className="header">
          <button className="brand" onClick={() => stage !== "writing" && again()} aria-label="PADIMI, start over">
            PADIMI
          </button>
        </header>

        <main className={stage === "writing" ? "main writing-main" : "main"}>
          {stage === "empty" && (
            <section className="rise">
              <h1>What are you<br />trying to say?</h1>
              <div className="start-actions">
                <button className="outline-pill" onClick={() => setStage("writing")}>Start writing</button>
                <button className="quiet-pill" onClick={pasteFromClipboard}>Paste from clipboard</button>
              </div>
            </section>
          )}

          {stage === "writing" && (
            <section className="writing-stage rise">              <textarea
                ref={areaRef}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setNudge(false); }}
                onKeyDown={onKeyDown}
                placeholder="Just start. Rough is fine."
                autoFocus
                spellCheck
                autoCapitalize="sentences"
                aria-label="Your draft"
                aria-describedby="draft-hint"
                readOnly={loading}
              />
              <div className="bottom-bar">
                <div className="control-row">
                  <div className="tone-row">
                    <span className="tone-caption">Tone</span>
                    <select value={tone} onChange={(event) => setTone(event.target.value)} aria-label="Tone">
                      {TONES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </div>
                  <input
                    className="instruction-input"
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    placeholder="Anything else? e.g. make it shorter"
                    aria-label="Extra instruction"
                    maxLength={240}
                  />
                </div>
                <div className="modes" role="radiogroup" aria-label="Refinement style">
                  {MODES.map((item) => (
                    <button
                      key={item.id}
                      role="radio"
                      aria-checked={mode === item.id}
                      title={item.hint}
                      onClick={() => setMode(item.id)}
                      className={mode === item.id ? "mode active" : "mode"}
                    >                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="action-row">
                  <span id="draft-hint" aria-live="polite">
                    {loading ? "Refining…" : nudge ? "Write a few words first." : words + " " + (words === 1 ? "word" : "words")}
                  </span>
                  <button
                    className={loading ? "refine-pill breathe" : "refine-pill"}
                    onClick={doRefine}
                    disabled={loading}
                  >
                    {loading ? "Refining" : "Refine"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {stage === "result" && (
            <section className="result-stage rise">
              <div className="result-top">                <span className="mode-label">{aiUsed ? "AI · " : "Local · "}{modeLabel} · {toneLabel}</span>
                <div className="views" role="tablist" aria-label="Compare versions">
                  {["refined", "original"].map((item) => (
                    <button
                      key={item}
                      role="tab"
                      aria-selected={view === item}
                      onClick={() => setView(item)}
                      className={view === item ? "view active" : "view"}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <p
                className={view === "original" ? "result-text original" : "result-text"}
                role="tabpanel"
                aria-live="polite"
              >
                {view === "refined" ? result : draft.trim()}
              </p>
              <div className="iterate-row">
                <input
                  className="instruction-input iterate-input"
                  value={iterationInstruction}
                  onChange={(event) => setIterationInstruction(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && iterationInstruction.trim()) refineAgain();
                  }}
                  placeholder="Change it again… e.g. shorter, warmer"
                  aria-label="Refine the current result"
                  maxLength={240}
                  disabled={loading}
                />
                <button
                  className="iterate-pill"
                  onClick={refineAgain}
                  disabled={loading || !iterationInstruction.trim()}
                >
                  {loading ? "Refining…" : "Refine again"}
                </button>
              </div>
              <div className="result-actions">
                <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>
                <button onClick={() => setStage("writing")}>Edit</button>
                <button onClick={again}>Write again</button>
              </div>
            </section>
          )}        </main>
        {stage !== "writing" && (
          <footer>YOUR WORDS, QUIETER AND CLEARER</footer>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);