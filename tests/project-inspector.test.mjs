import test from "node:test";
import assert from "node:assert/strict";
import { inspectProject } from "../shared/project-inspector.mjs";

const clip = (id, title, number, trim_start = 0, trim_end = 4) => ({ id, title, number, trim_start, trim_end });
test("empty project receives actionable error", () => {
  assert.equal(inspectProject({ clips: [] })[0].id, "no-clips");
});
test("flags invalid trimming and duplicate ranks", () => {
  const issues = inspectProject({ ranking: true, clips: [
    clip("a", "First", 6, 20, 10), clip("b", "Second", 6, 0, 3),
  ]});
  assert.ok(issues.some(item => item.id === "trim-a"));
  assert.ok(issues.some(item => item.id === "rank-b"));
});
test("flags unrecorded rights without asserting a copyright violation", () => {
  const issues = inspectProject({ clips: [clip("c", "Example", null)] });
  assert.ok(issues.some(item => item.id === "rights-c"));
  assert.ok(!issues.some(item => /copyright violation/i.test(item.message)));
});
test("allows a clean project with recorded rights", () => {
  const issues = inspectProject({ clips: [clip("c", "Example", null)], licenses: { c: { status: "mine" } }, settings: { music: false } });
  assert.equal(issues.length, 0);
});
