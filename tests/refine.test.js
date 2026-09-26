import test from "node:test";
import assert from "node:assert/strict";
import { refine, refineLocal } from "../src/refine.js";

test("empty input stays empty", () => {
  assert.equal(refineLocal("", "natural"), "");
});

test("natural mode preserves words and fixes punctuation", () => {
  assert.equal(
    refineLocal("hello  world , this is padimi", "natural"),
    "Hello world, this is padimi."
  );
});

test("clear mode removes filler", () => {
  assert.equal(
    refineLocal("I basically wanted to say thanks", "clear"),
    "I wanted to say thanks."
  );
});

test("strong mode is more direct", () => {
  assert.equal(
    refineLocal("I think that this is really useful", "strong"),
    "This is useful."
  );
});

test("multiline text keeps paragraph boundaries", () => {
  assert.equal(
    refineLocal("first line\nsecond line\n\nnew paragraph", "natural"),
    "First line.\nSecond line.\n\nNew paragraph."
  );
});
test("remote refinement preserves provider metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.tone, "neutral");
    assert.equal(body.instruction, "make it shorter");
    return new Response(
      JSON.stringify({ text: "Refined text.", provider: "groq" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  try {
    assert.deepEqual(await refine("rough text", "natural", "neutral", "make it shorter"), {
      text: "Refined text.",
      provider: "groq",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
