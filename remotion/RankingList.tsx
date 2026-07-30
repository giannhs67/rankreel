import { AbsoluteFill, Series, Video, useCurrentFrame, useVideoConfig } from "remotion";

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
};

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const TOP_HEIGHT = 900;

function clipFrames(clip: RankingClip, fps: number) {
  return Math.max(1, Math.round(clip.durationInSeconds * fps));
}

/** Used both by remotion/Root.tsx's <Composition calculateMetadata> and the in-app Player. */
export function getRankingListMetadata(props: RankingListProps) {
  const durationInFrames = Math.max(
    FPS,
    props.clips.reduce((sum, clip) => sum + clipFrames(clip, FPS), 0),
  );
  return { fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames };
}

export function RankingList({ clips }: RankingListProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // clips are ordered #N (highest/first-added) -> #1 (lowest/last-added), matching playback order.
  let cursor = 0;
  let currentIndex = 0;
  for (let i = 0; i < clips.length; i++) {
    const duration = clipFrames(clips[i], fps);
    if (frame < cursor + duration) {
      currentIndex = i;
      break;
    }
    cursor += duration;
    currentIndex = i;
  }

  const current = clips[currentIndex];
  const revealedIds = new Set(clips.slice(0, currentIndex + 1).map((c) => c.id));

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
            padding: 56,
            justifyContent: "center",
            gap: 20,
            fontFamily: "sans-serif",
          }}
        >
          {clips.map((clip) => {
            const isRevealed = revealedIds.has(clip.id);
            const isCurrent = current?.id === clip.id;
            return (
              <div
                key={clip.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? "translateY(0)" : "translateY(24px)",
                  transition: "opacity 0.2s, transform 0.2s",
                  fontSize: isCurrent ? 58 : 46,
                  fontWeight: 800,
                  color: "white",
                  textShadow: "0 2px 16px rgba(0,0,0,0.85)",
                }}
              >
                <span style={{ color: isCurrent ? "#facc15" : "white" }}>
                  #{clip.number ?? "–"}
                </span>
                <span>{clip.title}</span>
              </div>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Bottom: current clip, letterboxed */}
      <AbsoluteFill style={{ top: TOP_HEIGHT, backgroundColor: "black" }}>
        <Series>
          {clips.map((clip) => (
            <Series.Sequence key={clip.id} durationInFrames={clipFrames(clip, fps)}>
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
