import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RankingListProps } from "@/remotion/RankingList";
import { resolveRankingConfig } from "@/remotion/ranking-config";
import { getCustomFontSignedUrl, getSignedClipsForProject } from "./clip-signing";

/**
 * Fetches everything needed to render or preview a project's Ranking List: resolves the
 * project's template config (with a fresh signed URL for any custom font), and every clip
 * with a fresh signed Storage URL and its real (or best-guess) duration. Shared by the live
 * preview page and the local render worker so they can never drift apart.
 */
export async function getRankingRenderProps(
  supabase: SupabaseClient,
  projectId: string,
): Promise<(RankingListProps & { customFontUrl: string | null }) | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, template_id")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  let config = resolveRankingConfig(null);
  if (project.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("config_json")
      .eq("id", project.template_id)
      .single();
    if (template) config = resolveRankingConfig(template.config_json);
  }

  const customFontUrl =
    config.font.source === "custom"
      ? await getCustomFontSignedUrl(supabase, config.font.customFontPath)
      : null;
  const clips = await getSignedClipsForProject(supabase, projectId);

  return { projectName: project.name, clips, config, customFontUrl };
}
