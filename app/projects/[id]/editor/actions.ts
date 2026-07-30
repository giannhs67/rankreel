"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveRankingConfig, type RankingListConfig } from "@/remotion/ranking-config";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateTemplateConfig(
  projectId: string,
  templateId: string,
  config: RankingListConfig,
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
