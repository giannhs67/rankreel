import { interpolate, spring } from "remotion";

export type AnimationConfig = {
  type: "none" | "fade" | "slide" | "pop";
  durationInFrames: number;
};

/** A CSS style (opacity/transform) for an element that entered `framesSinceReveal` frames ago. */
export function entranceStyle(
  animation: AnimationConfig,
  framesSinceReveal: number,
  fps: number,
): React.CSSProperties {
  if (framesSinceReveal < 0) return { opacity: 0 };

  const { type, durationInFrames } = animation;

  if (type === "none") {
    return { opacity: 1 };
  }

  if (type === "fade") {
    const opacity = interpolate(framesSinceReveal, [0, durationInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity };
  }

  if (type === "slide") {
    const opacity = interpolate(framesSinceReveal, [0, durationInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(framesSinceReveal, [0, durationInFrames], [40, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity, transform: `translateY(${translateY}px)` };
  }

  // pop
  const scale = spring({
    frame: framesSinceReveal,
    fps,
    config: { damping: 10, stiffness: 180 },
    durationInFrames,
  });
  const opacity = interpolate(framesSinceReveal, [0, Math.min(durationInFrames, 8)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity, transform: `scale(${scale})` };
}
