import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { getRankingRenderProps } from "@/lib/ranking-render-data";
import { getTitleBannerRenderProps } from "@/lib/title-banner-render-data";
import { getCaptionRenderProps } from "@/lib/caption-render-data";
import type { CompositionFormat } from "@/shared/types";
import { RankingPreviewPlayer } from "./ranking-preview-player";
import { TitleBannerPreviewPlayer } from "./title-banner-preview-player";
import { CaptionPreviewPlayer } from "./caption-preview-player";

const TITLES: Record<CompositionFormat, string> = {
  ranking_list: "Ranking List preview",
  title_banner: "Title Banner preview",
  caption: "Caption preview",
};

export default async function ProjectPreviewPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inline?: string }>;
}) {
  const { id } = await params;
  const inline = (await searchParams).inline === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("format")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const format = project.format as CompositionFormat;

  let projectName = "";
  let clipCount = 0;
  let player: React.ReactNode = null;

  if (format === "title_banner") {
    const renderProps = await getTitleBannerRenderProps(supabase, id);
    if (!renderProps) notFound();
    projectName = renderProps.projectName;
    clipCount = renderProps.clips.length;
    if (clipCount > 0) player = <TitleBannerPreviewPlayer {...renderProps} />;
  } else if (format === "caption") {
    const renderProps = await getCaptionRenderProps(supabase, id);
    if (!renderProps) notFound();
    projectName = renderProps.projectName;
    clipCount = renderProps.clips.length;
    if (clipCount > 0) player = <CaptionPreviewPlayer {...renderProps} />;
  } else {
    const renderProps = await getRankingRenderProps(supabase, id);
    if (!renderProps) notFound();
    projectName = renderProps.projectName;
    clipCount = renderProps.clips.length;
    if (clipCount > 0) player = <RankingPreviewPlayer {...renderProps} />;
  }

  return (
    <div className={inline ? "min-h-screen bg-black text-white" : "min-h-screen"}>
      {!inline && <AppHeader email={user.email ?? ""} />}
      <main className={inline ? "mx-auto w-full max-w-[400px] p-2" : "mx-auto max-w-2xl space-y-6 p-6"}>
        {!inline && <div>
          <Link
            href={`/projects/${id}`}
            className="text-sm text-black/50 hover:underline dark:text-white/50"
          >
            ← {projectName}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{TITLES[format]}</h1>
        </div>}

        {clipCount === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Add at least one clip before previewing.
          </p>
        ) : (
          player
        )}
      </main>
    </div>
  );
}
