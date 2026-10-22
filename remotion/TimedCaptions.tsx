import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { StudioRenderSettings } from "@/shared/studio-settings";

export function TimedCaptions({ settings }: { settings?: StudioRenderSettings }) {
  const { fps } = useVideoConfig(), frame = useCurrentFrame();
  const seconds = frame / fps;
  if (!settings?.captions) return null;
  const active = (settings.timedCaptions ?? []).find(item => item.start <= seconds && seconds < item.end);
  if (!active) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center", padding: "0 95px 230px" }}>
    <div style={{ borderRadius: 16, background: "rgba(0,0,0,.8)", color: "#fff", fontFamily: "Arial,sans-serif",
      fontSize: 52, fontWeight: 900, textAlign: "center", lineHeight: 1.2,
      padding: "14px 24px", maxWidth: "100%", overflowWrap: "anywhere" }}>{active.text}</div>
  </AbsoluteFill>;
}
