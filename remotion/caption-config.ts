import type { AnimationConfig } from "./entrance-style";

export type CaptionConfig = {
  font: {
    source: "google" | "custom";
    googleFont: string;
    customFontPath: string | null;
    family: string;
  };
  text: {
    fontSize: number;
    color: string;
    backgroundColor: string;
  };
  position: { x: number; y: number };
  animation: AnimationConfig;
};

export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  font: {
    source: "google",
    googleFont: "Inter",
    customFontPath: null,
    family: "Inter",
  },
  text: {
    fontSize: 52,
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  position: { x: 80, y: 1600 },
  animation: { type: "fade", durationInFrames: 10 },
};

export function resolveCaptionConfig(
  stored: Partial<CaptionConfig> | null | undefined,
): CaptionConfig {
  if (!stored) return DEFAULT_CAPTION_CONFIG;
  return {
    font: { ...DEFAULT_CAPTION_CONFIG.font, ...stored.font },
    text: { ...DEFAULT_CAPTION_CONFIG.text, ...stored.text },
    position: { ...DEFAULT_CAPTION_CONFIG.position, ...stored.position },
    animation: { ...DEFAULT_CAPTION_CONFIG.animation, ...stored.animation },
  };
}
