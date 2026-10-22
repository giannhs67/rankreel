"use client";

import { Player } from "@remotion/player";
import { Caption, getCaptionMetadata, type CaptionProps } from "@/remotion/Caption";
import { useLoadFont } from "@/lib/use-load-font";
import { useStudioPreviewSettings } from "@/lib/use-studio-preview-settings";

export function CaptionPreviewPlayer(props: CaptionProps & { customFontUrl: string | null }) {
  const { customFontUrl, ...playerProps } = props;
  const studioSettings = useStudioPreviewSettings();
  const { fps, durationInFrames, width, height } = getCaptionMetadata(playerProps);

  useLoadFont(
    {
      font: props.config.font,
      text: { fontSize: 0, baseColor: "", currentColor: "", strokeColor: "", strokeWidth: 0 },
      position: props.config.position,
      animation: props.config.animation,
    },
    customFontUrl,
  );

  return (
    <div
      className="mx-auto overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: 360 }}
    >
      <Player
        component={Caption}
        inputProps={{ ...playerProps, ...(studioSettings ? { studioSettings } : {}) }}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: "100%", height: "100%" }}
        controls
        loop
      />
    </div>
  );
}
