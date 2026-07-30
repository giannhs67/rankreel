import { AbsoluteFill, Series, Video, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_RANKING_CONFIG, type RankingListConfig } from "./ranking-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";

export type RankingClip = {
  id: string;
  title: string;
  number: number | null;
  videoUrl: string;
  durationInSeconds: number;
};

export type RankingListProps = {
  projectName: string;
  clips: RankingClip[];
  config: RankingListConfig;
};

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const TOP_HEIGHT = 900;

/** Used both by remotion/Root.tsx's <Composition calculateMetadata> and the in-app Player. */
export function getRankingListMetadata(props: RankingListProps) {
  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: getTotalDurationInFrames(props.clips, FPS),
  };
}

export function RankingList({ clips, config = DEFAULT_RANKING_CONFIG }: RankingListProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // clips are ordered #N (highest/first-added) -> #1 (lowest/last-added), matching playback order.
  const startFrames = getClipStartFrames(clips, fps);
  const currentIndex = getCurrentClipIndex(startFrames, frame);
  const current = clips[currentIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Top: blurred backdrop of the current clip + the ranking list */}
      <AbsoluteFill style={{ height: TOP_HEIGHT, overflow: "hidden" }}>
        {current && (
          <AbsoluteFill>
            <Video
              src={current.videoUrl}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(40px) brightness(0.5)",
                transform: "scale(1.2)",
              }}
            />
          </AbsoluteFill>
        )}
        <AbsoluteFill
          style={{
            padding: 0,
            fontFamily: `"${config.font.family}", sans-serif`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: config.position.x,
              top: config.position.y,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {clips.map((clip, i) => {
              const isCurrent = i === currentIndex;
              const framesSinceReveal = frame - startFrames[i];
              const style = entranceStyle(config.animation, framesSinceReveal, fps);
              return (
                <div
                  key={clip.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    fontSize: isCurrent ? config.text.fontSize * 1.25 : config.text.fontSize,
                    fontWeight: 800,
                    color: isCurrent ? config.text.currentColor : config.text.baseColor,
                    WebkitTextStroke:
                      config.text.strokeWidth > 0
                        ? `${config.text.strokeWidth}px ${config.text.strokeColor}`
                        : undefined,
                    textShadow: "0 2px 16px rgba(0,0,0,0.85)",
                    ...style,
                  }}
                >
                  <span>#{clip.number ?? "–"}</span>
                  <span>{clip.title}</span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Bottom: current clip, letterboxed */}
      <AbsoluteFill style={{ top: TOP_HEIGHT, backgroundColor: "black" }}>
        <Series>
          {clips.map((clip) => (
            <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
              <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
                <Video src={clip.videoUrl} style={{ maxWidth: "100%", maxHeight: "100%" }} />
              </AbsoluteFill>
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
