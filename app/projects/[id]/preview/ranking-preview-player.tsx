"use client";

import { Player } from "@remotion/player";
import { RankingList, getRankingListMetadata, type RankingListProps } from "@/remotion/RankingList";

export function RankingPreviewPlayer(props: RankingListProps) {
  const { fps, durationInFrames, width, height } = getRankingListMetadata(props);

  return (
    <div
      className="mx-auto overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: 360 }}
    >
      <Player
        component={RankingList}
        inputProps={props}
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
