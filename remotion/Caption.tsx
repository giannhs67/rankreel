import { BackgroundMusic } from "./BackgroundMusic";
import { SoundEffects } from "./SoundEffects";
import { TimedCaptions } from "./TimedCaptions";
import { AbsoluteFill, Series, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_CAPTION_CONFIG, type CaptionConfig } from "./caption-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";
import { trimStartFrame } from "../shared/trim-window.mjs";
import type { StudioRenderSettings } from "@/shared/studio-settings";
import { getClipVideoFilter } from "@/shared/video-looks";

// Each clip's `title` doubles as its full caption sentence, shown for that clip's whole
// duration. This is NOT true word-by-word sync — that needs per-word timestamps, which means
// either an ASR/transcription integration or a manual per-word timing editor, neither of which
// exists yet. This composition is real and renders actual captions, just at per-clip
// granularity rather than per-word.
export type CaptionClip = {
  id: string;
  title: string;
  videoUrl: string;
  durationInSeconds: number;
  trimStartInSeconds: number;
};

export type CaptionProps = {
  projectName: string;
  clips: CaptionClip[];
  config: CaptionConfig;
  studioSettings?: StudioRenderSettings;
};

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export function getCaptionMetadata(props: CaptionProps) {
  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: getTotalDurationInFrames(props.clips, FPS),
  };
}

export function Caption({ clips, config = DEFAULT_CAPTION_CONFIG, studioSettings }: CaptionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrames = getClipStartFrames(clips, fps);
  const currentIndex = getCurrentClipIndex(startFrames, frame);
  const current = clips[currentIndex];
  const framesSinceReveal = frame - startFrames[currentIndex];
  const style = entranceStyle(config.animation, framesSinceReveal, fps);
  const transition = studioSettings?.transitions ?? "cut";
  const fade = transition === "fade"
    ? interpolate(framesSinceReveal, [0, Math.max(1, Math.round(fps * 0.25))], [0, 1], { extrapolateRight: "clamp" })
    : 1;
  const zoom = transition === "zoom"
    ? interpolate(framesSinceReveal, [0, Math.max(1, Math.round(fps * 0.3))], [1.12, 1], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <BackgroundMusic settings={studioSettings} />
      <SoundEffects settings={studioSettings} />
      <AbsoluteFill style={{ opacity: fade, transform: `scale(${zoom})` }}>
      <Series>
        {clips.map((clip) => (
          <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
            <AbsoluteFill>
              <Video src={clip.videoUrl} startFrom={trimStartFrame(clip, fps)} style={{ width: "100%", height: "100%", objectFit: studioSettings?.cropMode === "contain" ? "contain" : "cover", transform: `scale(${(studioSettings?.cropZoom ?? 100) / 100})`, filter: getClipVideoFilter(studioSettings, clip.id) }} />
            </AbsoluteFill>
          </Series.Sequence>
        ))}
      </Series>

      {(studioSettings?.captions ?? true) && current && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              left: config.position.x,
              right: config.position.x,
              top: config.position.y,
              display: "flex",
              justifyContent: "center",
              ...style,
            }}
          >
            <span
              style={{
                fontFamily: `"${config.font.family}", sans-serif`,
                fontSize: config.text.fontSize,
                fontWeight: 700,
                color: config.text.color,
                backgroundColor: config.text.backgroundColor,
                padding: "12px 28px",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              {current.title}
            </span>
          </div>
        </AbsoluteFill>
      )}
      </AbsoluteFill>
      {studioSettings?.overlayText?.trim() && (
        <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-start", alignItems: "center", paddingTop: 125 }}>
          <div style={{ color: "#fff", backgroundColor: "rgba(0,0,0,.72)", borderRadius: 16, fontSize: 54, fontWeight: 900, padding: "14px 30px", maxWidth: "88%", textAlign: "center", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {studioSettings.overlayText}
          </div>
        </AbsoluteFill>
      )}
      <TimedCaptions settings={studioSettings} />
    </AbsoluteFill>
  );
}
