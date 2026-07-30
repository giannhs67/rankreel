"use client";

import { Player } from "@remotion/player";
import { TitleBanner, getTitleBannerMetadata, type TitleBannerProps } from "@/remotion/TitleBanner";
import { useLoadFont } from "@/lib/use-load-font";

export function TitleBannerPreviewPlayer(props: TitleBannerProps & { customFontUrl: string | null }) {
  const { customFontUrl, ...playerProps } = props;
  const { fps, durationInFrames, width, height } = getTitleBannerMetadata(playerProps);

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
        component={TitleBanner}
        inputProps={playerProps}
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
