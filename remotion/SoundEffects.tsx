import { Audio, Sequence, useVideoConfig } from "remotion";
import type { StudioRenderSettings } from "@/shared/studio-settings";
import type { SoundEffectKind } from "@/shared/sound-effects";

/** Small deterministic generated PCM WAV cues; no external service, license, or asset requests. */
function cueDataUrl(kind: SoundEffectKind): string {
  const hz = 16000, seconds = kind === "chime" ? 0.48 : 0.24;
  const samples = Math.floor(hz * seconds);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, hz, true); view.setUint32(28, hz * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const t = i / hz, ratio = i / samples;
    const frequency = kind === "click" ? 1100 : kind === "pop" ? 380 - ratio * 220 : 540 + ratio * 260;
    const envelope = (1 - ratio) ** (kind === "chime" ? 1.8 : 4);
    const wave = Math.sin(2 * Math.PI * (frequency * t)) * envelope * 0.43;
    view.setInt16(44 + i * 2, Math.round(wave * 32767), true);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return "data:audio/wav;base64," + btoa(binary);
}

export function SoundEffects({ settings }: { settings?: StudioRenderSettings }) {
  const { fps } = useVideoConfig();
  const cues = settings?.soundCues ?? [];
  return <>{cues.map(cue => (
    <Sequence key={cue.id} from={Math.round(cue.atSeconds * fps)} layout="none">
      <Audio src={cueDataUrl(cue.kind)} volume={cue.volume / 100} />
    </Sequence>
  ))}</>;
}
