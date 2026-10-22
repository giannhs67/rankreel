export type SoundEffectKind = "pop" | "click" | "chime";
export type SoundCue = { id: string; kind: SoundEffectKind; atSeconds: number; volume: number };
export const SOUND_NAMES: Record<SoundEffectKind, string> = { pop: "Pop", click: "Click", chime: "Chime" };
export function parseSoundCues(input: unknown): SoundCue[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).flatMap((item): SoundCue[] => {
    if (!item || typeof item !== "object") return [];
    const x = item as Record<string, unknown>;
    if (typeof x.id !== "string" || !/^[a-zA-Z0-9_-]{1,90}$/.test(x.id) ||
        !["pop", "click", "chime"].includes(String(x.kind)) ||
        typeof x.atSeconds !== "number" || !Number.isFinite(x.atSeconds) ||
        x.atSeconds < 0 || x.atSeconds > 3600 ||
        typeof x.volume !== "number" || !Number.isFinite(x.volume) || x.volume < 0 || x.volume > 100) return [];
    return [{ id: x.id, kind: x.kind as SoundEffectKind, atSeconds: x.atSeconds, volume: x.volume }];
  });
}
