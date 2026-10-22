export type MusicTrack = {
  storagePath: string;
  url: string;
  title: string;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  videoStart: number;
};

export function parseMusicTrack(value: unknown): MusicTrack | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.storagePath !== "string" || !/^[a-f0-9-]{36}\/music\/[a-f0-9-]{36}\.(mp3|wav|m4a|ogg)$/.test(v.storagePath) ||
      typeof v.url !== "string" || typeof v.title !== "string" || v.title.length > 180) return null;
  for (const key of ["duration", "sourceStart", "sourceEnd", "videoStart"]) {
    if (typeof v[key] !== "number" || !Number.isFinite(v[key]) || (v[key] as number) < 0) return null;
  }
  if ((v.duration as number) <= 0 || (v.duration as number) > 900 ||
      (v.sourceEnd as number) <= (v.sourceStart as number) ||
      (v.sourceEnd as number) > (v.duration as number) || (v.videoStart as number) > 3600) return null;
  return v as MusicTrack;
}
