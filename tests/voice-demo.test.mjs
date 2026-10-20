import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/voiceover/index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("demo contains an executable JavaScript script", async () => {
  assert.ok(script, "inline script missing");
  const { Script } = await import("node:vm");
  assert.doesNotThrow(() => new Script(script));
});

test("voice preview has playback, stop, and all three modes", () => {
  for (const id of ["play", "stop", "script"]) assert.match(html, new RegExp('id="' + id + '"'));
  for (const mode of ["deep", "energetic", "documentary"]) assert.match(html, new RegExp('data-voice="' + mode + '"'));
  assert.match(script, /synth\.speak\(u\)/);
  assert.match(script, /synth\.cancel\(\)/);
});

test("voice preview has speech feature detection and errors", () => {
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /u\.onerror/);
  assert.match(html, /<meta name="viewport"/);
});
