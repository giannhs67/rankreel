import { AbsoluteFill, Series, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_TITLE_BANNER_CONFIG, type TitleBannerConfig } from "./title-banner-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";
import { trimStartFrame } from "../shared/trim-window.mjs";
import type { StudioRenderSettings } from "@/shared/studio-settings";
import { getClipVideoFilter } from "@/shared/video-looks";

export type TitleBannerClip = {
  id: string;
  title: string;
  videoUrl: string;
  durationInSeconds: number;
  trimStartInSeconds: number;
};

export type TitleBannerProps = {
  projectName: string;
  clips: TitleBannerClip[];
  config: TitleBannerConfig;
  studioSettings?: StudioRenderSettings;
};

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export function getTitleBannerMetadata(props: TitleBannerProps) {
  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: getTotalDurationInFrames(props.clips, FPS),
  };
}

export function TitleBanner({ clips, config = DEFAULT_TITLE_BANNER_CONFIG, studioSettings }: TitleBannerProps) {
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
      <AbsoluteFill style={{ opacity: fade, transform: `scale(${zoom})` }}>
      <Series>
        {clips.map((clip) => (
          <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
            <AbsoluteFill>
              <Video src={clip.videoUrl} startFrom={trimStartFrame(clip, fps)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: getClipVideoFilter(studioSettings, clip.id) }} />
            </AbsoluteFill>
          </Series.Sequence>
        ))}
      </Series>

      {(studioSettings?.captions ?? true) && current && (
        <div
          style={{
            position: "absolute",
            left: config.position.x,
            top: config.position.y,
            maxWidth: WIDTH - config.position.x * 2,
            fontFamily: `"${config.font.family}", sans-serif`,
            fontSize: config.text.fontSize,
            fontWeight: 800,
            color: config.text.color,
            WebkitTextStroke:
              config.text.strokeWidth > 0
                ? `${config.text.strokeWidth}px ${config.text.strokeColor}`
                : undefined,
            textShadow: "0 2px 16px rgba(0,0,0,0.85)",
            ...style,
          }}
        >
          {current.title}
        </div>
      )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
