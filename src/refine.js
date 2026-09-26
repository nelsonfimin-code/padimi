export const MODES = [
  { id: "clear", label: "Clear", hint: "Trims filler for easier reading" },
  { id: "natural", label: "Natural", hint: "Light cleanup, your voice intact" },
  { id: "strong", label: "Strong", hint: "More direct where it is safe" },
];

const CLEAR_RULES = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bin the event that\b/gi, "if"],
  [/\bfor the purpose of\b/gi, "for"],
  [/\bat the end of the day,?\s*/gi, ""],
  [/\b(?:basically|actually|literally),?\s+/gi, ""],
  [/\bkind of\s+(?=\w)/gi, ""],
  [/\bsort of\s+(?=\w)/gi, ""],
  [/\bthe fact that\b/gi, "that"],
];

const STRONG_RULES = [
  ...CLEAR_RULES,
  [/\bI just wanted to\s+/gi, "I want to "],
  [/\bI was wondering if you could\b/gi, "could you"],
  [/\bI think that\s+/gi, ""],
  [/\bjust\s+(?=(?:wanted|checking|a quick)\b)/gi, ""],
  [/\bvery\s+(?=\w)/gi, ""],
  [/\breally\s+(?=\w)/gi, ""],
  [/\bperhaps\s+/gi, ""],
  [/\bsomewhat\s+/gi, ""],
];

function applyRules(text, rules) {
  return rules.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

function cleanLine(line) {
  let text = line
    .replace(/[ \t]+/g, " ")
    .trim()
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
    .replace(/,{2,}/g, ",")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/\b(\w+) \1\b/gi, (match, word) => /^(had|that)$/i.test(word) ? match : word)
    .replace(/\bi\b/g, "I")
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());

  if (text && !/[.!?…:"')\]]$/.test(text)) text += ".";
  return text;
}

export function refineLocal(text, mode) {
  if (typeof text !== "string" || !text.trim()) return "";
  const rules = mode === "clear" ? CLEAR_RULES : mode === "strong" ? STRONG_RULES : [];
  return text.replace(/\r\n?/g, "\n").split(/\n{2,}/)
    .map(paragraph => paragraph.split("\n").map(line => cleanLine(applyRules(line, rules))).filter(Boolean).join("\n"))
    .filter(Boolean).join("\n\n");
}

export async function refine(text, mode) {
  const response = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, mode }),
  });
  if (!response.ok) throw new Error("AI refinement unavailable");
  const data = await response.json();
  if (!data?.text) throw new Error("AI returned no text");
  return data.text;
}
