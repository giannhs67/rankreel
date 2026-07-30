import type { AnimationConfig } from "./entrance-style";

export type TitleBannerConfig = {
  font: {
    source: "google" | "custom";
    googleFont: string;
    customFontPath: string | null;
    family: string;
  };
  text: {
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
  };
  position: { x: number; y: number };
  animation: AnimationConfig;
};

export const DEFAULT_TITLE_BANNER_CONFIG: TitleBannerConfig = {
  font: {
    source: "google",
    googleFont: "Anton",
    customFontPath: null,
    family: "Anton",
  },
  text: {
    fontSize: 72,
    color: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: 2,
  },
  position: { x: 56, y: 1500 },
  animation: { type: "slide", durationInFrames: 15 },
};

export function resolveTitleBannerConfig(
  stored: Partial<TitleBannerConfig> | null | undefined,
): TitleBannerConfig {
  if (!stored) return DEFAULT_TITLE_BANNER_CONFIG;
  return {
    font: { ...DEFAULT_TITLE_BANNER_CONFIG.font, ...stored.font },
    text: { ...DEFAULT_TITLE_BANNER_CONFIG.text, ...stored.text },
    position: { ...DEFAULT_TITLE_BANNER_CONFIG.position, ...stored.position },
    animation: { ...DEFAULT_TITLE_BANNER_CONFIG.animation, ...stored.animation },
  };
}
