"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompositionFormat } from "@/shared/types";

export type CreateProjectState = { error?: string } | undefined;

const VALID_FORMATS: CompositionFormat[] = ["ranking_list", "title_banner", "caption"];

export async function createProject(_prevState: CreateProjectState, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Project name is required." };
  }

  const formatRaw = String(formData.get("format") ?? "ranking_list");
  const format = VALID_FORMATS.includes(formatRaw as CompositionFormat)
    ? (formatRaw as CompositionFormat)
    : "ranking_list";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({ name, owner_id: user.id, format })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/projects/${data.id}`);
}
