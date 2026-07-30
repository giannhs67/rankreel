"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RankingListConfig } from "@/remotion/ranking-config";

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
