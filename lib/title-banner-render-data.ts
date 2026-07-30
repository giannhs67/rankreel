import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TitleBannerProps } from "@/remotion/TitleBanner";
import { resolveTitleBannerConfig } from "@/remotion/title-banner-config";
import { getCustomFontSignedUrl, getSignedClipsForProject } from "./clip-signing";

export async function getTitleBannerRenderProps(
  supabase: SupabaseClient,
  projectId: string,
): Promise<(TitleBannerProps & { customFontUrl: string | null }) | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, template_id")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  let config = resolveTitleBannerConfig(null);
  if (project.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("config_json")
      .eq("id", project.template_id)
      .single();
    if (template) config = resolveTitleBannerConfig(template.config_json);
  }

  const customFontUrl =
    config.font.source === "custom"
      ? await getCustomFontSignedUrl(supabase, config.font.customFontPath)
      : null;
  const clips = await getSignedClipsForProject(supabase, projectId);

  return { projectName: project.name, clips, config, customFontUrl };
}
