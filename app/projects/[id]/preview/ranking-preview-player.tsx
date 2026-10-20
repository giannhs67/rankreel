"use client";

import { Player } from "@remotion/player";
import { useState } from "react";
import { parseStudioSettings, type StudioRenderSettings } from "@/shared/studio-settings";
import { RankingList, getRankingListMetadata, type RankingListProps } from "@/remotion/RankingList";
import { useLoadFont } from "@/lib/use-load-font";

export function RankingPreviewPlayer(props: RankingListProps & { customFontUrl: string | null }) {
  const { customFontUrl, ...playerProps } = props;
  const [studioSettings] = useState<StudioRenderSettings | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const projectId = window.location.pathname.split("/")[2];
      const raw = window.localStorage.getItem(`short-tube-studio-${projectId}`);
      return raw ? parseStudioSettings(JSON.parse(raw)) : null;
    } catch { return null; }
  });
  const { fps, durationInFrames, width, height } = getRankingListMetadata(playerProps);

  // Ensures the Google/custom font is actually loaded in the browser before the Player
  // (which renders with real DOM/canvas, not headless Chrome) draws text with it.
  useLoadFont(props.config, customFontUrl);

  return (
    <div
      className="mx-auto overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: 360 }}
    >
      <Player
        component={RankingList}
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
