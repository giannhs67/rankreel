import { VIDEO_LOOKS, type VideoLook } from "./video-looks";

export type StudioRenderSettings = {
  videoLook: VideoLook;
  captions: boolean;
  music: boolean;
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
  const videoLook = typeof v.videoLook === "string" &&
    Object.prototype.hasOwnProperty.call(VIDEO_LOOKS, v.videoLook)
    ? v.videoLook as VideoLook
    : "original";
  return {
    videoLook,
    captions: v.captions, music: v.music,
    transitions: v.transitions as StudioRenderSettings["transitions"],
    captionStyle: v.captionStyle as StudioRenderSettings["captionStyle"],
    volume: v.volume, script: v.script,
    voice: v.voice as StudioRenderSettings["voice"],
  };
}
