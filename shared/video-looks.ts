/** Video-only color grades. Text and captions stay readable and keep their chosen colors. */
export const VIDEO_LOOKS = {
  original: { label: "Original", filter: "none" },
  retro80s: { label: "80s Retro", filter: "saturate(1.5) contrast(1.2) sepia(0.18) hue-rotate(315deg)" },
  monochrome: { label: "Black & White", filter: "grayscale(1) contrast(1.22)" },
  vintage: { label: "Vintage Film", filter: "sepia(0.65) saturate(0.78) contrast(0.92) brightness(1.06)" },
  cinematic: { label: "Cinematic", filter: "contrast(1.25) saturate(0.82) brightness(0.92)" },
} as const;

export type VideoLook = keyof typeof VIDEO_LOOKS;

export function getVideoLookFilter(look: VideoLook | undefined | null, intensity = 100): string {
  const amount = Math.max(0, Math.min(100, Number.isFinite(intensity) ? intensity : 100)) / 100;
  if (!look || look === "original" || amount === 0) return "none";
  // Interpolate each grade's CSS parameters toward their neutral values.
  const mix = (neutral: number, target: number) => Number((neutral + (target - neutral) * amount).toFixed(3));
  switch (look) {
    case "retro80s":
      return `saturate(${mix(1, 1.5)}) contrast(${mix(1, 1.2)}) sepia(${mix(0, 0.18)}) hue-rotate(${mix(0, 315)}deg)`;
    case "monochrome":
      return `grayscale(${mix(0, 1)}) contrast(${mix(1, 1.22)})`;
    case "vintage":
      return `sepia(${mix(0, 0.65)}) saturate(${mix(1, 0.78)}) contrast(${mix(1, 0.92)}) brightness(${mix(1, 1.06)})`;
    case "cinematic":
      return `contrast(${mix(1, 1.25)}) saturate(${mix(1, 0.82)}) brightness(${mix(1, 0.92)})`;
    default:
      return "none";
  }
}

/** Use the clip override when one exists, otherwise the project-wide look. */
export function getClipVideoFilter(
  settings: { videoLook?: VideoLook; lookIntensity?: number; clipLooks?: Record<string, { look: VideoLook; intensity: number }> } | null | undefined,
  clipId: string,
): string {
  const override = settings?.clipLooks?.[clipId];
  return getVideoLookFilter(override?.look ?? settings?.videoLook, override?.intensity ?? settings?.lookIntensity ?? 100);
}
