import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTrimWindow, trimStartFrame } from "../shared/trim-window.mjs";

test("trim 20–30 seconds starts at frame 600 and lasts 10 seconds", () => {
  const clip = resolveTrimWindow(20, 30);
  assert.deepEqual(clip, { trimStartInSeconds: 20, durationInSeconds: 10 });
  assert.equal(trimStartFrame(clip, 30), 600);
});

test("untrimmed old clips start at zero with a four-second fallback", () => {
  const clip = resolveTrimWindow(null, null);
  assert.deepEqual(clip, { trimStartInSeconds: 0, durationInSeconds: 4 });
  assert.equal(trimStartFrame(clip, 30), 0);
});

test("fractional positions become source-frame offsets", () => {
  assert.equal(trimStartFrame(resolveTrimWindow(1.5, 3.75), 30), 45);
  assert.equal(resolveTrimWindow(1.5, 3.75).durationInSeconds, 2.25);
});

test("each Remotion composition seeks from the same source offset", () => {
  for (const filename of ["RankingList", "TitleBanner", "Caption"]) {
    const code = readFileSync(new URL("../remotion/" + filename + ".tsx", import.meta.url), "utf8");
    assert.match(code, /startFrom=\{trimStartFrame\(clip, fps\)\}/);
    if (filename === "RankingList") {
      assert.equal((code.match(/startFrom=\{trimStartFrame\(clip, fps\)\}/g) ?? []).length, 2,
        "both ranking foreground and blurred background must seek to the same source position");
    }
  }
});
