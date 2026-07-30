// Shared sequencing math for every composition that plays a list of clips back-to-back
// (Ranking List, Title Banner, Caption) and needs to know "which clip is active right now"
// and "how many frames since that clip started" (for entrance animations).

export type TimedClip = { durationInSeconds: number };

export function clipFramesFor(durationInSeconds: number, fps: number) {
  return Math.max(1, Math.round(durationInSeconds * fps));
}

export function getClipStartFrames(clips: TimedClip[], fps: number): number[] {
  const startFrames: number[] = [];
  let cursor = 0;
  for (const clip of clips) {
    startFrames.push(cursor);
    cursor += clipFramesFor(clip.durationInSeconds, fps);
  }
  return startFrames;
}

export function getCurrentClipIndex(startFrames: number[], frame: number): number {
  let currentIndex = 0;
  for (let i = 0; i < startFrames.length; i++) {
    if (frame >= startFrames[i]) currentIndex = i;
  }
  return currentIndex;
}

export function getTotalDurationInFrames(clips: TimedClip[], fps: number): number {
  return Math.max(
    fps,
    clips.reduce((sum, clip) => sum + clipFramesFor(clip.durationInSeconds, fps), 0),
  );
}
