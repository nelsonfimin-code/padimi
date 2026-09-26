const TONE_INSTRUCTIONS = {
  neutral: "Use a neutral, natural tone.",
  professional: "Use a professional, polished tone. Keep it human and avoid corporate jargon.",
  friendly: "Use a friendly, warm tone. Sound approachable, not overly cheerful.",
  casual: "Use a relaxed, casual tone. Keep it natural and easy to read.",
  funny: "Use light, natural humor where it fits. Do not force jokes or change the meaning.",
  confident: "Use a confident tone. Sound clear and self-assured without sounding arrogant.",
  polite: "Use a polite and considerate tone. Keep it clear without sounding overly formal.",
};

const MODE_INSTRUCTIONS = {
  clear: "Make the writing clear and easy to read. Remove unnecessary filler, repetition, and awkward wording. Keep the user's meaning, personality, and level of formality.",
  natural: "Lightly improve the writing so it sounds natural, clean, and human. Keep the user's words, meaning, personality, and level of formality wherever possible.",
  strong: "Make the writing more direct and confident. Remove unnecessary hedging and filler, but do not make it aggressive, corporate, or unlike the user's voice.",
};
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, mode = "natural", tone = "neutral" } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Text is required" });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI provider is not configured" });
  const instruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.natural;
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.neutral;
  const prompt = ["You are PADIMI, a personal writing editor.", instruction, toneInstruction, "Return only the rewritten text. Do not explain the changes. Do not add quotes around it.", "Preserve paragraph breaks. Never invent facts or ideas.", "", "DRAFT:", text.trim()].join("\n");
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", messages: [
        { role: "system", content: "You edit text precisely. Preserve meaning and voice. Output only the finished text." },
        { role: "user", content: prompt }
      ], temperature: mode === "strong" ? 0.35 : 0.2, max_tokens: Math.min(4000, Math.max(256, text.length * 2)) })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: data?.error?.message || "AI provider error" });
    const output = data?.choices?.[0]?.message?.content?.trim();
    if (!output) return res.status(502).json({ error: "AI returned no text" });
    return res.status(200).json({ text: output, provider: "groq", model: process.env.GROQ_MODEL || "llama-3.1-8b-instant" });
  } catch { return res.status(502).json({ error: "Could not reach AI provider" }); }
}