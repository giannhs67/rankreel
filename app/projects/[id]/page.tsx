import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ClipUploadForm } from "./clip-upload-form";
import { SortableClipList } from "./sortable-clip-list";
import { RenderPanel } from "./render-panel";
import { StudioControls } from "./studio-controls";
import { CreatorTools } from "./creator-tools";
import { MediaLibrary } from "./media-library";
import { ClipFinder } from "./clip-finder";
import { ShortsBuilder } from "./shorts-builder";
import { FormatSwitcher } from "./format-switcher";
import { QuickStyle } from "./quick-style";
import { resolveRankingConfig } from "@/remotion/ranking-config";
import { resolveTitleBannerConfig } from "@/remotion/title-banner-config";
import { resolveCaptionConfig } from "@/remotion/caption-config";

function captionBackgroundToPicker(value: string): { accentColor: string; captionOpacity: number } {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return { accentColor: value, captionOpacity: 100 };
  const match = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0?\.\d+|1(?:\.0+)?|0))?\s*\)$/);
  if (!match) return { accentColor: "#000000", captionOpacity: 65 };
  const rgb = match.slice(1, 4).map(v => Math.max(0, Math.min(255, Number(v))).toString(16).padStart(2, "0")).join("");
  return { accentColor: "#" + rgb, captionOpacity: Math.round(Number(match[4] ?? 1) * 100) };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, format, template_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: clips } = await supabase
    .from("clips")
    .select("id, title, number, storage_path, trim_start, trim_end")
    .eq("project_id", id)
    .order("order_index", { ascending: true });

  const usedRanks = new Set((clips ?? []).map(clip => clip.number).filter((number): number is number => number !== null));
  const nextRankingNumber = [6, 5, 4, 3, 2, 1].find(number => !usedRanks.has(number)) ?? 0;

  const { data: savedStyle } = project.template_id
    ? await supabase.from("templates").select("config_json").eq("id", project.template_id).single()
    : { data: null };
  const rawStyle = savedStyle?.config_json ?? null;
  const quickStyle = project.format === "ranking_list"
    ? (() => { const v = resolveRankingConfig(rawStyle as Parameters<typeof resolveRankingConfig>[0]); return {
        textColor: v.text.baseColor, accentColor: v.text.currentColor, fontSize: v.text.fontSize }; })()
    : project.format === "caption"
      ? (() => { const v = resolveCaptionConfig(rawStyle as Parameters<typeof resolveCaptionConfig>[0]); return {
          textColor: v.text.color, ...captionBackgroundToPicker(v.text.backgroundColor),
          fontSize: v.text.fontSize }; })()
      : (() => { const v = resolveTitleBannerConfig(rawStyle as Parameters<typeof resolveTitleBannerConfig>[0]); return {
          textColor: v.text.color, accentColor: v.text.strokeColor, fontSize: v.text.fontSize }; })();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, progress, output_path, error, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
              ← Projects
            </Link>
            <h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}/editor`}
              className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
            >
              Style
            </Link>
            {!!clips?.length && (
              <Link
                href={`/projects/${project.id}/preview`}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Preview
              </Link>
            )}
          </div>
        </div>

        <FormatSwitcher projectId={project.id} currentFormat={project.format} clipCount={clips?.length ?? 0} />

        {project.format === "ranking_list" ? (
          <section className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Dedicated workspace</p>
                <h2 className="text-xl font-bold">Ranking Studio</h2>
                <p className="text-sm text-black/60 dark:text-white/60">Numbered clips, countdown layout, ranking effects and preview. The existing composition uses a six-position layout.</p>
              </div>
              <span className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-black">RANKING</span>
            </div>
            <StudioControls projectId={project.id} ranking clips={clips ?? []} />
          </section>
        ) : (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">General workspace</p>
              <h2 className="text-xl font-bold">Video Editor</h2>
              <p className="text-sm text-black/60 dark:text-white/60">Build your story or edit your footage scene by scene.</p>
            </div>
            <StudioControls projectId={project.id} clips={clips ?? []} />
          </section>
        )}

        <QuickStyle projectId={project.id} format={project.format} initial={quickStyle} />

        <ShortsBuilder projectId={project.id} clips={clips ?? []} ranking={project.format === "ranking_list"} />
        <MediaLibrary projectId={project.id} clips={clips ?? []} />
        <ClipFinder projectId={project.id} clips={clips ?? []} ranking={project.format === "ranking_list"} />

        <CreatorTools projectId={project.id} clips={clips ?? []} ranking={project.format === "ranking_list"} />

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            {project.format === "ranking_list" ? "Add a ranking clip" : "Add a video scene"}
          </h2>
          {project.format === "ranking_list" && (clips?.length ?? 0) >= 6 ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
              All six ranking positions are filled. Edit, reorder or remove a clip to change the list.
            </p>
          ) : (
            <ClipUploadForm projectId={project.id} nextRankingNumber={project.format === "ranking_list" ? nextRankingNumber : 0} />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            {project.format === "ranking_list" ? `Ranking clips (${clips?.length ?? 0}; six suggested)` : `Video scenes (${clips?.length ?? 0})`}
          </h2>
          {!clips?.length && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No clips yet — upload one above.
            </p>
          )}
          <SortableClipList projectId={project.id} clips={clips ?? []} ranking={project.format === "ranking_list"} />
        </section>

        {!!clips?.length && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
              Render
            </h2>
            <RenderPanel projectId={project.id} initialJobs={jobs ?? []} />
          </section>
        )}
      </main>
    </div>
  );
}
