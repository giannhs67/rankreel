"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveRankingConfig, type RankingListConfig } from "@/remotion/ranking-config";
import { resolveTitleBannerConfig } from "@/remotion/title-banner-config";
import { resolveCaptionConfig } from "@/remotion/caption-config";
import type { TitleBannerConfig } from "@/remotion/title-banner-config";
import type { CaptionConfig } from "@/remotion/caption-config";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Any format's config — templates.config_json is just jsonb, so one action serves all formats.
type AnyTemplateConfig = RankingListConfig | TitleBannerConfig | CaptionConfig;

export async function updateTemplateConfig(
  projectId: string,
  templateId: string,
  config: AnyTemplateConfig,
) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("templates")
    .update({ config_json: config })
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

/** Snapshots the current config as a new, reusable named template (doesn't touch the project). */
export async function saveAsTemplate(
  projectId: string,
  name: string,
  config: RankingListConfig,
) {
  const { supabase, user } = await requireUser();

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Template name is required.");

  const { error } = await supabase.from("templates").insert({
    owner_id: user.id,
    name: trimmedName,
    format: "ranking_list",
    config_json: config,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/editor`);
}

/** Copies a saved template's config into this project's own (live-editable) template row. */
export async function applyTemplate(
  projectId: string,
  currentTemplateId: string,
  sourceTemplateId: string,
): Promise<RankingListConfig> {
  const { supabase } = await requireUser();

  const { data: source, error: sourceError } = await supabase
    .from("templates")
    .select("config_json")
    .eq("id", sourceTemplateId)
    .single();

  if (sourceError || !source) throw new Error(sourceError?.message ?? "Template not found.");

  const resolved = resolveRankingConfig(source.config_json);

  const { error } = await supabase
    .from("templates")
    .update({ config_json: resolved })
    .eq("id", currentTemplateId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);

  return resolved;
}

/** Minimal style controls on the project dashboard; no separate Style page required. */
export async function saveQuickStyle(
  projectId: string,
  updates: { textColor: string; accentColor: string; fontSize: number },
) {
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (!hex.test(updates.textColor) || !hex.test(updates.accentColor) ||
      !Number.isInteger(updates.fontSize) || updates.fontSize < 24 || updates.fontSize > 120) {
    throw new Error("Invalid quick style values.");
  }

  const { supabase, user } = await requireUser();
  const { data: project, error: lookupError } = await supabase.from("projects")
    .select("id, name, format, template_id").eq("id", projectId)
    .eq("owner_id", user.id).single();
  if (lookupError || !project) throw new Error("Project not found.");

  let templateId: string | null = project.template_id;
  let stored: Record<string, unknown> | null = null;
  if (templateId) {
    const { data: template, error: templateError } = await supabase.from("templates")
      .select("config_json").eq("id", templateId).eq("owner_id", user.id).single();
    if (templateError || !template) throw new Error("Style template not found.");
    stored = template.config_json;
  }

  const format = project.format;
  let config: AnyTemplateConfig;
  if (format === "ranking_list") {
    const base = resolveRankingConfig(stored);
    config = { ...base, text: { ...base.text, fontSize: updates.fontSize,
      baseColor: updates.textColor, currentColor: updates.accentColor } };
  } else if (format === "title_banner") {
    const base = resolveTitleBannerConfig(stored);
    config = { ...base, text: { ...base.text, fontSize: updates.fontSize,
      color: updates.textColor, strokeColor: updates.accentColor } };
  } else if (format === "caption") {
    const base = resolveCaptionConfig(stored);
    config = { ...base, text: { ...base.text, fontSize: updates.fontSize,
      color: updates.textColor, backgroundColor: updates.accentColor } };
  } else {
    throw new Error("Unsupported format.");
  }

  if (!templateId) {
    const { data: created, error: createError } = await supabase.from("templates")
      .insert({ owner_id: user.id, name: `${project.name} quick style`,
        format, config_json: config }).select("id").single();
    if (createError || !created) throw new Error(createError?.message ?? "Could not create style.");
    templateId = created.id;
    const { error: attachError } = await supabase.from("projects")
      .update({ template_id: templateId }).eq("id", projectId).eq("owner_id", user.id);
    if (attachError) throw new Error(attachError.message);
  } else {
    const { error: saveError } = await supabase.from("templates")
      .update({ config_json: config }).eq("id", templateId).eq("owner_id", user.id);
    if (saveError) throw new Error(saveError.message);
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}
