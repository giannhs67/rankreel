import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import type { RankingClip } from "@/remotion/RankingList";
import { resolveRankingConfig } from "@/remotion/ranking-config";
import { RankingPreviewPlayer } from "./ranking-preview-player";

// Clips have no probed duration yet (real trimming is still a TODO) — this is a placeholder
// length per clip for the preview, used only when trim_start/trim_end aren't set.
const DEFAULT_CLIP_SECONDS = 4;
const SIGNED_URL_TTL_SECONDS = 60 * 30;
const CUSTOM_FONT_URL_TTL_SECONDS = 60 * 60;

export default async function ProjectPreviewPage({
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
    .select("id, name, template_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  let templateConfig = resolveRankingConfig(null);
  if (project.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("config_json")
      .eq("id", project.template_id)
      .single();
    if (template) templateConfig = resolveRankingConfig(template.config_json);
  }

  let customFontUrl: string | null = null;
  if (templateConfig.font.source === "custom" && templateConfig.font.customFontPath) {
    const { data: signed } = await supabase.storage
      .from("fonts")
      .createSignedUrl(templateConfig.font.customFontPath, CUSTOM_FONT_URL_TTL_SECONDS);
    customFontUrl = signed?.signedUrl ?? null;
  }

  const { data: clips } = await supabase
    .from("clips")
    .select("id, title, number, storage_path, trim_start, trim_end")
    .eq("project_id", id)
    .order("order_index", { ascending: true });

  const rankingClips: RankingClip[] = [];
  for (const clip of clips ?? []) {
    const { data: signed } = await supabase.storage
      .from("clips")
      .createSignedUrl(clip.storage_path, SIGNED_URL_TTL_SECONDS);
    if (!signed) continue;

    const durationInSeconds =
      clip.trim_start != null && clip.trim_end != null && clip.trim_end > clip.trim_start
        ? clip.trim_end - clip.trim_start
        : DEFAULT_CLIP_SECONDS;

    rankingClips.push({
      id: clip.id,
      title: clip.title,
      number: clip.number,
      videoUrl: signed.signedUrl,
      durationInSeconds,
    });
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <Link
            href={`/projects/${project.id}`}
            className="text-sm text-black/50 hover:underline dark:text-white/50"
          >
            ← {project.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Ranking List preview</h1>
        </div>

        {rankingClips.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Add at least one clip before previewing.
          </p>
        ) : (
          <RankingPreviewPlayer
            projectName={project.name}
            clips={rankingClips}
            config={templateConfig}
            customFontUrl={customFontUrl}
          />
        )}
      </main>
    </div>
  );
}
