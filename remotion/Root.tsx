import { Composition } from "remotion";
import { RankingList, getRankingListMetadata, type RankingListProps } from "./RankingList";
import { DEFAULT_RANKING_CONFIG } from "./ranking-config";
import { TitleBanner, getTitleBannerMetadata, type TitleBannerProps } from "./TitleBanner";
import { DEFAULT_TITLE_BANNER_CONFIG } from "./title-banner-config";
import { Caption, getCaptionMetadata, type CaptionProps } from "./Caption";
import { DEFAULT_CAPTION_CONFIG } from "./caption-config";

const rankingListDefaultProps: RankingListProps = {
  projectName: "Preview",
  clips: [],
  config: DEFAULT_RANKING_CONFIG,
};

const titleBannerDefaultProps: TitleBannerProps = {
  projectName: "Preview",
  clips: [],
  config: DEFAULT_TITLE_BANNER_CONFIG,
};

const captionDefaultProps: CaptionProps = {
  projectName: "Preview",
  clips: [],
  config: DEFAULT_CAPTION_CONFIG,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RankingList"
        component={RankingList}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={rankingListDefaultProps}
        calculateMetadata={({ props }) => getRankingListMetadata(props)}
      />
      <Composition
        id="TitleBanner"
        component={TitleBanner}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={titleBannerDefaultProps}
        calculateMetadata={({ props }) => getTitleBannerMetadata(props)}
      />
      <Composition
        id="Caption"
        component={Caption}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={captionDefaultProps}
        calculateMetadata={({ props }) => getCaptionMetadata(props)}
      />
    </>
  );
};
