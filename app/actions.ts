"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = { error?: string } | undefined;

export async function createProject(_prevState: CreateProjectState, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Project name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/projects/${data.id}`);
}
