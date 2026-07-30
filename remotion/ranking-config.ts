export type RankingListConfig = {
  font: {
    source: "google" | "custom";
    /** Google Fonts family name, e.g. "Bebas Neue". Only used when source === "google". */
    googleFont: string;
    /** Storage path in the `fonts` bucket. Only used when source === "custom". */
    customFontPath: string | null;
    /** Resolved CSS font-family to actually apply (google font name, or a generated name for custom fonts). */
    family: string;
  };
  text: {
    fontSize: number;
    baseColor: string;
    currentColor: string;
    strokeColor: string;
    strokeWidth: number;
  };
  position: {
    x: number;
    y: number;
  };
  animation: {
    type: "none" | "fade" | "slide" | "pop";
    durationInFrames: number;
  };
};

export const CURATED_GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Montserrat",
  "Roboto",
  "Archivo Black",
] as const;

export const DEFAULT_RANKING_CONFIG: RankingListConfig = {
  font: {
    source: "google",
    googleFont: "Inter",
    customFontPath: null,
    family: "Inter",
  },
  text: {
    fontSize: 46,
    baseColor: "#ffffff",
    currentColor: "#facc15",
    strokeColor: "#000000",
    strokeWidth: 0,
  },
  position: { x: 56, y: 0 },
  animation: {
    type: "slide",
    durationInFrames: 15,
  },
};

/** Merges a possibly-partial/legacy config (or {}) from the DB with defaults. */
export function resolveRankingConfig(
  stored: Partial<RankingListConfig> | null | undefined,
): RankingListConfig {
  if (!stored) return DEFAULT_RANKING_CONFIG;
  return {
    font: { ...DEFAULT_RANKING_CONFIG.font, ...stored.font },
    text: { ...DEFAULT_RANKING_CONFIG.text, ...stored.text },
    position: { ...DEFAULT_RANKING_CONFIG.position, ...stored.position },
    animation: { ...DEFAULT_RANKING_CONFIG.animation, ...stored.animation },
  };
}
