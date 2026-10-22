/** Shared, dependency-free source trimming math for preview and MP4 export. */
export function resolveTrimWindow(start, end, fallbackSeconds = 4) {
  const validStart = typeof start === "number" && Number.isFinite(start) && start >= 0 ? start : 0;
  const validEnd = typeof end === "number" && Number.isFinite(end) && end > validStart ? end : null;
  return { trimStartInSeconds: validStart, durationInSeconds: validEnd === null ? fallbackSeconds : validEnd - validStart };
}

export function trimStartFrame(clip, fps) {
  return Math.max(0, Math.round((clip.trimStartInSeconds ?? 0) * fps));
}
