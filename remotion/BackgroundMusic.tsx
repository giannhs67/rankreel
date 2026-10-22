import { Audio, Sequence, useVideoConfig } from "remotion";
import type { StudioRenderSettings } from "@/shared/studio-settings";

export function BackgroundMusic({ settings }: { settings?: StudioRenderSettings }) {
  const { fps, durationInFrames } = useVideoConfig();
  const track = settings?.musicTrack;
  if (!settings?.music || !track) return null;
  const from = Math.round(track.videoStart * fps);
  const start = Math.round(track.sourceStart * fps);
  const end = Math.round(track.sourceEnd * fps);
  const duration = Math.min(end - start, durationInFrames - from);
  if (duration <= 0) return null;
  return <Sequence from={from} durationInFrames={duration} layout="none">
    <Audio src={track.url} startFrom={start} endAt={end} volume={settings.volume / 100} />
  </Sequence>;
}
