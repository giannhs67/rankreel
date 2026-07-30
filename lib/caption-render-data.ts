import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaptionProps } from "@/remotion/Caption";
import { resolveCaptionConfig } from "@/remotion/caption-config";
import { getCustomFontSignedUrl, getSignedClipsForProject } from "./clip-signing";

export async function getCaptionRenderProps(
  supabase: SupabaseClient,
  projectId: string,
): Promise<(CaptionProps & { customFontUrl: string | null }) | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, template_id")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  let config = resolveCaptionConfig(null);
  if (project.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("config_json")
      .eq("id", project.template_id)
      .single();
    if (template) config = resolveCaptionConfig(template.config_json);
  }

  const customFontUrl =
    config.font.source === "custom"
      ? await getCustomFontSignedUrl(supabase, config.font.customFontPath)
      : null;
  const clips = await getSignedClipsForProject(supabase, projectId);

  return { projectName: project.name, clips, config, customFontUrl };
}
