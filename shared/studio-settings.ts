import { parseMusicTrack, type MusicTrack } from "./music-track";
import { VIDEO_LOOKS, type VideoLook } from "./video-looks";

export type StudioRenderSettings = {
  videoLook: VideoLook;
  cropMode: "cover" | "contain";
  cropZoom: number;
  overlayText: string;
  lookIntensity: number;
  clipLooks: Record<string, { look: VideoLook; intensity: number }>;
  captions: boolean;
  music: boolean;
  musicTrack?: MusicTrack | null;
  transitions: "cut" | "fade" | "zoom";
  captionStyle: "bold" | "minimal" | "karaoke";
  volume: number;
  script: string;
  voice: "deep" | "energetic" | "documentary";
};

export function parseStudioSettings(value: unknown): StudioRenderSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.captions !== "boolean" || typeof v.music !== "boolean" ||
      !["cut", "fade", "zoom"].includes(String(v.transitions)) ||
      !["bold", "minimal", "karaoke"].includes(String(v.captionStyle)) ||
      typeof v.volume !== "number" || !Number.isFinite(v.volume) ||
      v.volume < 0 || v.volume > 100 ||
      typeof v.script !== "string" || v.script.length > 5000 ||
      !["deep", "energetic", "documentary"].includes(String(v.voice))) return null;
  const musicTrack = v.musicTrack == null ? null : parseMusicTrack(v.musicTrack);
  if (v.musicTrack != null && !musicTrack) return null;
  const videoLook = typeof v.videoLook === "string" &&
    Object.prototype.hasOwnProperty.call(VIDEO_LOOKS, v.videoLook)
    ? v.videoLook as VideoLook
    : "original";
  const lookIntensity = typeof v.lookIntensity === "number" && Number.isFinite(v.lookIntensity)
    ? Math.max(0, Math.min(100, v.lookIntensity)) : 100;
  const clipLooks: StudioRenderSettings["clipLooks"] = {};
  if (v.clipLooks && typeof v.clipLooks === "object" && !Array.isArray(v.clipLooks)) {
    for (const [id, entry] of Object.entries(v.clipLooks as Record<string, unknown>).slice(0, 200)) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !entry || typeof entry !== "object") continue;
      const value = entry as Record<string, unknown>;
      if (typeof value.look !== "string" || !Object.prototype.hasOwnProperty.call(VIDEO_LOOKS, value.look)) continue;
      if (typeof value.intensity !== "number" || !Number.isFinite(value.intensity)) continue;
      clipLooks[id] = { look: value.look as VideoLook, intensity: Math.max(0, Math.min(100, value.intensity)) };
    }
  }
  const cropMode = v.cropMode === "contain" ? "contain" : "cover";
  const cropZoom = typeof v.cropZoom === "number" && Number.isFinite(v.cropZoom)
    ? Math.max(100, Math.min(200, v.cropZoom)) : 100;
  const overlayText = typeof v.overlayText === "string" ? v.overlayText.slice(0, 160) : "";
  return {
    cropMode, cropZoom, overlayText,
    videoLook, lookIntensity, clipLooks,
    captions: v.captions, music: v.music, musicTrack,
    transitions: v.transitions as StudioRenderSettings["transitions"],
    captionStyle: v.captionStyle as StudioRenderSettings["captionStyle"],
    volume: v.volume, script: v.script,
    voice: v.voice as StudioRenderSettings["voice"],
  };
}
