/** Deterministic, metadata-only checks. This DOES NOT inspect actual video frames or audio. */
export function inspectProject({ clips = [], ranking = false, settings = null, licenses = {} }) {
  const issues = [];
  if (!clips.length) {
    issues.push({ level: "error", id: "no-clips", message: "Upload at least one video clip." });
    return issues;
  }
  if (ranking && clips.length !== 6) {
    issues.push({ level: "warning", id: "count", message: "Ranking Studio currently targets 6 clips; found " + clips.length + "." });
  }
  const seen = new Set();
  for (const clip of clips) {
    if (!String(clip.title ?? "").trim()) issues.push({ level: "warning", id: "title-" + clip.id, message: "Clip is missing a title." });
    if (String(clip.title ?? "").length > 68) issues.push({ level: "warning", id: "long-title-" + clip.id, message: "Very long title may overlap the video: " + String(clip.title).slice(0, 30) + "..." });
    const a = clip.trim_start;
    const b = clip.trim_end;
    if (a != null && b != null && (!(Number(b) > Number(a)) || Number(a) < 0)) {
      issues.push({ level: "error", id: "trim-" + clip.id, message: "Invalid trim range for " + (clip.title || "clip") + "." });
    }
    if (ranking && clip.number != null) {
      if (seen.has(clip.number)) issues.push({ level: "error", id: "rank-" + clip.id, message: "Duplicate ranking number #" + clip.number + "." });
      seen.add(clip.number);
    }
    const license = licenses[clip.id];
    if (!license || license.status === "unknown") issues.push({ level: "warning", id: "rights-" + clip.id, message: "Rights not recorded for " + (clip.title || "clip") + "." });
  }
  if (settings?.script?.trim() && settings.script.trim().length > 5000) {
    issues.push({ level: "error", id: "script", message: "Voiceover script exceeds the 5,000-character limit." });
  }
  if (settings?.music) issues.push({ level: "info", id: "music", message: "Music is not connected to MP4 export yet." });
  return issues;
}
