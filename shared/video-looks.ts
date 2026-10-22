/** Video-only color grades. Text and captions stay readable and keep their chosen colors. */
export const VIDEO_LOOKS = {
  original: { label: "Original", filter: "none" },
  retro80s: { label: "80s Retro", filter: "saturate(1.5) contrast(1.2) sepia(0.18) hue-rotate(315deg)" },
  monochrome: { label: "Black & White", filter: "grayscale(1) contrast(1.22)" },
  vintage: { label: "Vintage Film", filter: "sepia(0.65) saturate(0.78) contrast(0.92) brightness(1.06)" },
  cinematic: { label: "Cinematic", filter: "contrast(1.25) saturate(0.82) brightness(0.92)" },
} as const;

export type VideoLook = keyof typeof VIDEO_LOOKS;

export function getVideoLookFilter(look: VideoLook | undefined | null): string {
  return VIDEO_LOOKS[look ?? "original"]?.filter ?? "none";
}
