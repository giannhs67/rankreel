import { AbsoluteFill, Series, Video, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_CAPTION_CONFIG, type CaptionConfig } from "./caption-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";

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
};

export type CaptionProps = {
  projectName: string;
  clips: CaptionClip[];
  config: CaptionConfig;
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

export function Caption({ clips, config = DEFAULT_CAPTION_CONFIG }: CaptionProps) {
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
              <Video src={clip.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
          </Series.Sequence>
        ))}
      </Series>

      {current && (
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
  );
}
