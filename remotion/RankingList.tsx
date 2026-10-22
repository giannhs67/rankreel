import { AbsoluteFill, Series, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { StudioRenderSettings } from "@/shared/studio-settings";
import { getClipVideoFilter } from "@/shared/video-looks";
import { DEFAULT_RANKING_CONFIG, type RankingListConfig } from "./ranking-config";
import { clipFramesFor, getClipStartFrames, getCurrentClipIndex, getTotalDurationInFrames } from "./clip-timing";
import { entranceStyle } from "./entrance-style";
import { trimStartFrame } from "../shared/trim-window.mjs";

export type RankingClip = {
  id: string;
  title: string;
  number: number | null;
  videoUrl: string;
  durationInSeconds: number;
  trimStartInSeconds: number;
};

export type RankingListProps = {
  projectName: string;
  clips: RankingClip[];
  config: RankingListConfig;
  studioSettings?: StudioRenderSettings;
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

export function RankingList({ clips, config = DEFAULT_RANKING_CONFIG, studioSettings }: RankingListProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // clips are ordered #N (highest/first-added) -> #1 (lowest/last-added), matching playback order.
  const startFrames = getClipStartFrames(clips, fps);
  const currentIndex = getCurrentClipIndex(startFrames, frame);
  const current = clips[currentIndex];
  // Playback order is editable independently. Visually sort by the actual rank,
  // so #1 stays at the top even when clips have been dragged into a different order.
  const displayClips = [...clips].sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  const clipFrame = frame - (startFrames[currentIndex] ?? 0);
  const transition = studioSettings?.transitions ?? "cut";
  const opacity = transition === "fade" ? interpolate(clipFrame, [0, Math.max(1, Math.round(fps * 0.25))], [0, 1], { extrapolateRight: "clamp" }) : 1;


  const zoom = transition === "zoom" ? interpolate(clipFrame, [0, Math.max(1, Math.round(fps * 0.3))], [1.12, 1], { extrapolateRight: "clamp" }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Top: blurred backdrop of the current clip + the ranking list */}
      <AbsoluteFill style={{ height: TOP_HEIGHT, overflow: "hidden" }}>
        <Series>
          {clips.map((clip) => (
            <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
              <AbsoluteFill>
                <Video
                  src={clip.videoUrl}
                  startFrom={trimStartFrame(clip, fps)}
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: `${getClipVideoFilter(studioSettings, clip.id)} blur(40px) brightness(0.5)`,
                    transform: "scale(1.2)",
                  }}
                />
              </AbsoluteFill>
            </Series.Sequence>
          ))}
        </Series>
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
            {displayClips.map((clip) => {
              const playbackIndex = clips.findIndex((item) => item.id === clip.id);
              const isCurrent = playbackIndex === currentIndex;
              const framesSinceReveal = frame - startFrames[playbackIndex];
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
      <AbsoluteFill style={{ top: TOP_HEIGHT, backgroundColor: "black", transform: `scale(${zoom})` }}>
        <Series>
          {clips.map((clip) => (
            <Series.Sequence key={clip.id} durationInFrames={clipFramesFor(clip.durationInSeconds, fps)}>
              <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
                <Video src={clip.videoUrl} startFrom={trimStartFrame(clip, fps)} style={{ maxWidth: "100%", maxHeight: "100%", filter: getClipVideoFilter(studioSettings, clip.id) }} />
              </AbsoluteFill>
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
      {current && transition === "fade" && (
        <AbsoluteFill style={{ pointerEvents: "none", top: TOP_HEIGHT, opacity: 1 - opacity, backgroundColor: "black" }} />
      )}
      {studioSettings?.captions && current && (
        <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center", paddingBottom: 200 }}>
          <div style={{ maxWidth: "85%", padding: "16px 24px", borderRadius: 14, backgroundColor: studioSettings.captionStyle === "minimal" ? "rgba(0,0,0,.65)" : "#facc15", color: studioSettings.captionStyle === "minimal" ? "#fff" : "#111", fontSize: studioSettings.captionStyle === "minimal" ? 38 : 50, fontWeight: 900, textAlign: "center", textTransform: "uppercase" }}>{current.title}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
