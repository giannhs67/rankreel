"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function addClip(input: {
  projectId: string;
  storagePath: string;
  title: string;
  number: number | null;
  /** Real duration read from the video file in the browser, if it could be determined. */
  durationInSeconds: number | null;
}) {
  const { supabase, user } = await requireUser();

  const { count } = await supabase
    .from("clips")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId);

  const { error } = await supabase.from("clips").insert({
    project_id: input.projectId,
    owner_id: user.id,
    storage_path: input.storagePath,
    title: input.title,
    number: input.number,
    order_index: count ?? 0,
    trim_start: input.durationInSeconds != null ? 0 : null,
    trim_end: input.durationInSeconds,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${input.projectId}`);
}

export async function updateClip(
  projectId: string,
  clipId: string,
  formData: FormData,
) {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const numberRaw = String(formData.get("number") ?? "").trim();
  const number = numberRaw === "" ? null : Number(numberRaw);
  const trimStartRaw = String(formData.get("trim_start") ?? "").trim();
  const trimEndRaw = String(formData.get("trim_end") ?? "").trim();
  const trim_start = trimStartRaw === "" ? null : Number(trimStartRaw);
  const trim_end = trimEndRaw === "" ? null : Number(trimEndRaw);

  const { error } = await supabase
    .from("clips")
    .update({ title, number, trim_start, trim_end })
    .eq("id", clipId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteClip(projectId: string, clipId: string, storagePath: string) {
  const { supabase } = await requireUser();

  await supabase.storage.from("clips").remove([storagePath]);

  const { error } = await supabase.from("clips").delete().eq("id", clipId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function moveClip(projectId: string, clipId: string, direction: "up" | "down") {
  const { supabase } = await requireUser();

  const { data: clips, error } = await supabase
    .from("clips")
    .select("id, order_index")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error || !clips) throw new Error(error?.message ?? "Failed to load clips");

  const idx = clips.findIndex((c) => c.id === clipId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= clips.length) return;

  const a = clips[idx];
  const b = clips[swapWith];

  const { error: err1 } = await supabase
    .from("clips")
    .update({ order_index: b.order_index })
    .eq("id", a.id);
  if (err1) throw new Error(err1.message);

  const { error: err2 } = await supabase
    .from("clips")
    .update({ order_index: a.order_index })
    .eq("id", b.id);
  if (err2) throw new Error(err2.message);

  revalidatePath(`/projects/${projectId}`);
}
