import { Composition } from "remotion";
import { RankingList, getRankingListMetadata, type RankingListProps } from "./RankingList";
import { DEFAULT_RANKING_CONFIG } from "./ranking-config";

const defaultProps: RankingListProps = {
  projectName: "Preview",
  clips: [],
  config: DEFAULT_RANKING_CONFIG,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RankingList"
      component={RankingList}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => getRankingListMetadata(props)}
    />
  );
};
