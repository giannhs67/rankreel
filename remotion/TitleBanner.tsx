import { AbsoluteFill, Series, Video, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_TITLE_BANNER_CONFIG, type TitleBannerConfig } from "./title-banner-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";
import { trimStartFrame } from "../shared/trim-window.mjs";

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

export function TitleBanner({ clips, config = DEFAULT_TITLE_BANNER_CONFIG }: TitleBannerProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrames = getClipStartFrames(clips, fps);
  const currentIndex = getCurrentClipIndex(startFrames, frame);
  const current = clips[currentIndex];
  const framesSinceReveal = frame - startFrames[currentIndex];
  const style = entranceStyle(config.animation, framesSinceReveal, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {clips.map((clip) => (
          <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
            <AbsoluteFill>
              <Video src={clip.videoUrl} startFrom={trimStartFrame(clip, fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
          </Series.Sequence>
        ))}
      </Series>

      {current && (
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
  );
}
