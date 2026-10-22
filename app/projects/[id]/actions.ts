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

  if (!input.storagePath.startsWith(`${input.projectId}/`) || input.storagePath.includes("..")) {
    throw new Error("Invalid clip storage path.");
  }
  if (!input.title.trim() || input.title.length > 180) {
    throw new Error("Clip title must be between 1 and 180 characters.");
  }
  if (input.number !== null && (!Number.isInteger(input.number) || input.number < 1 || input.number > 6)) {
    throw new Error("Ranking number must be between 1 and 6.");
  }
  if (input.durationInSeconds !== null && (!Number.isFinite(input.durationInSeconds) || input.durationInSeconds <= 0)) {
    throw new Error("Invalid source video duration.");
  }
  const { data: project, error: projectError } = await supabase
    .from("projects").select("id, format").eq("id", input.projectId).single();
  if (projectError || !project) throw new Error("Project not found.");
  const { data: existingClips, error: clipsError } = await supabase
    .from("clips").select("number").eq("project_id", input.projectId);
  if (clipsError) throw new Error(clipsError.message);
  if (project.format === "ranking_list") {
    if ((existingClips?.length ?? 0) >= 6) throw new Error("Ranking Studio supports up to six clips.");
    if (input.number !== null && existingClips?.some(clip => clip.number === input.number)) {
      throw new Error("Ranking #" + input.number + " already exists.");
    }
  }

  // Use the maximum stored position: a deleted middle clip must not cause duplicate indices.
  const { data: lastClip, error: positionError } = await supabase
    .from("clips").select("order_index").eq("project_id", input.projectId)
    .order("order_index", { ascending: false }).limit(1);
  if (positionError) throw new Error(positionError.message);
  const nextPosition = (lastClip?.[0]?.order_index ?? -1) + 1;

  const { error } = await supabase.from("clips").insert({
    project_id: input.projectId,
    owner_id: user.id,
    storage_path: input.storagePath,
    title: input.title,
    number: input.number,
    order_index: nextPosition,
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
  if (!title || title.length > 180) throw new Error("Title must be between 1 and 180 characters.");
  const numberRaw = String(formData.get("number") ?? "").trim();
  const number = numberRaw === "" ? null : Number(numberRaw);
  const trimStartRaw = String(formData.get("trim_start") ?? "").trim();
  const trimEndRaw = String(formData.get("trim_end") ?? "").trim();
  const trim_start = trimStartRaw === "" ? null : Number(trimStartRaw);
  const trim_end = trimEndRaw === "" ? null : Number(trimEndRaw);

  if (number !== null && (!Number.isInteger(number) || number < 1 || number > 6)) {
    throw new Error("Ranking number must be between 1 and 6.");
  }
  if ((trim_start === null) !== (trim_end === null)) {
    throw new Error("Enter both start and end times, or leave both empty.");
  }
  if (trim_start !== null && trim_end !== null &&
      (!Number.isFinite(trim_start) || !Number.isFinite(trim_end) || trim_start < 0 || trim_end <= trim_start)) {
    throw new Error("Trim end must be greater than trim start.");
  }
  const { data: currentProject, error: projectError } = await supabase
    .from("projects").select("format").eq("id", projectId).single();
  if (projectError || !currentProject) throw new Error("Project not found.");
  if (currentProject.format === "ranking_list" && number !== null) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("clips").select("id").eq("project_id", projectId).eq("number", number).neq("id", clipId).limit(1);
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicate?.length) throw new Error("Ranking #" + number + " already exists.");
  }

  const { error } = await supabase
    .from("clips")
    .update({ title, number, trim_start, trim_end })
    .eq("id", clipId)
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteClip(projectId: string, clipId: string, _storagePath: string) {
  const { supabase } = await requireUser();

  // Read the trusted path from the database, not from the caller.
  const { data: clip, error: lookupError } = await supabase
    .from("clips").select("storage_path")
    .eq("id", clipId).eq("project_id", projectId).single();
  if (lookupError || !clip) throw new Error("Clip not found.");

  // Remove the record first: never leave a clip referring to an already-deleted video.
  const { data: removed, error } = await supabase.from("clips")
    .delete().eq("id", clipId).eq("project_id", projectId).select("id");
  if (error) throw new Error(error.message);
  if (!removed?.length) throw new Error("Clip was not deleted.");

  // Storage cleanup is best-effort. A failed cleanup can leave an orphaned file
  // but never breaks a surviving clip or prevents the UI from updating.
  // Split scenes can reference the same underlying file. Delete it only if unreferenced.
  const { count, error: refError } = await supabase.from("clips")
    .select("id", { count: "exact", head: true }).eq("storage_path", clip.storage_path);
  if (!refError && count === 0) {
    const { error: storageError } = await supabase.storage.from("clips").remove([clip.storage_path]);
    if (storageError) console.error("[clips] storage cleanup failed:", storageError.message);
  }

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
    .eq("project_id", projectId)
    .eq("id", a.id);
  if (err1) throw new Error(err1.message);

  const { error: err2 } = await supabase
    .from("clips")
    .update({ order_index: a.order_index })
    .eq("project_id", projectId)
    .eq("id", b.id);
  if (err2) throw new Error(err2.message);

  revalidatePath(`/projects/${projectId}`);
}


/** Reorder clips for desktop drag-and-drop and mobile position selection. */
export async function moveClipToPosition(projectId: string, clipId: string, targetIndex: number) {
  const { supabase } = await requireUser();
  if (!Number.isInteger(targetIndex)) throw new Error("Invalid position");

  const { data: clips, error } = await supabase
    .from("clips")
    .select("id, order_index")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error || !clips) throw new Error(error?.message ?? "Failed to load clips");
  const currentIndex = clips.findIndex((clip) => clip.id === clipId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= clips.length) {
    throw new Error("Clip or target position not found");
  }
  if (currentIndex === targetIndex) return;

  const reordered = [...clips];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  // Assign temporary distinct indices first, avoiding collisions with current indices.
  const maxIndex = Math.max(0, ...clips.map((clip) => clip.order_index ?? 0));
  for (let i = 0; i < reordered.length; i++) {
    const { error: updateError } = await supabase
      .from("clips")
      .update({ order_index: maxIndex + i + 1 })
      .eq("project_id", projectId)
      .eq("id", reordered[i].id);
    if (updateError) throw new Error(updateError.message);
  }
  for (let i = 0; i < reordered.length; i++) {
    const { error: updateError } = await supabase
      .from("clips")
      .update({ order_index: i })
      .eq("project_id", projectId)
      .eq("id", reordered[i].id);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Change the actual Remotion composition used by preview and MP4 export.
 * Leave uploaded clips, timing, voiceover draft and previous templates intact.
 * A new format gets its own template when the Style editor is first opened.
 */
export async function changeProjectFormat(
  projectId: string,
  format: "ranking_list" | "title_banner" | "caption",
) {
  const allowed = ["ranking_list", "title_banner", "caption"];
  if (!allowed.includes(format)) throw new Error("Unsupported video format.");

  const { supabase, user } = await requireUser();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, format")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();
  if (projectError || !project) throw new Error("Project not found.");
  if (project.format === format) return;

  // Ranking is a six-clip composition. Do not discard or truncate existing clips.
  if (format === "ranking_list") {
    const { count, error: countError } = await supabase
      .from("clips")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 6) {
      throw new Error("Ranking supports up to 6 clips. Remove extra clips before switching.");
    }
  }

  // Keep old templates in storage; only unlink the incompatible template.
  // The Style editor will create an appropriately typed template on first visit.
  const { data: changed, error } = await supabase
    .from("projects")
    .update({ format, template_id: null })
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!changed?.length) throw new Error("Format was not changed.");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

/** Assign countdown numbers 6,5,.. according to the chosen playback order.
 * Existing video files, trims and positions are never modified.
 */
export async function arrangeRankingNumbers(projectId: string) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase.from("projects").select("format").eq("id", projectId).single();
  if (project?.format !== "ranking_list") throw new Error("Use this in a ranking project.");
  const { data: clips, error } = await supabase.from("clips")
    .select("id, number").eq("project_id", projectId).order("order_index", { ascending: true });
  if (error || !clips) throw new Error(error?.message ?? "Cannot load clips.");
  if (clips.length > 6) throw new Error("Ranking supports up to 6 clips.");
  const previous = clips.map(clip => ({ id: clip.id, number: clip.number }));

  // Set to null before assigning new numbers to avoid a temporary duplicate rank.
  for (const clip of clips) {
    const { error: clearError } = await supabase.from("clips")
      .update({ number: null }).eq("project_id", projectId).eq("id", clip.id);
    if (clearError) throw new Error(clearError.message);
  }
  for (let i = 0; i < clips.length; i++) {
    const { error: updateError } = await supabase.from("clips")
      .update({ number: 6 - i }).eq("project_id", projectId).eq("id", clips[i].id);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/preview`);
  return previous;
}

/** Restore the previous ranks from an explicit user Undo operation. */
export async function restoreRankingNumbers(
  projectId: string, saved: { id: string; number: number | null }[],
) {
  if (saved.length > 6 || saved.some(item => !item.id || (
    item.number !== null && (!Number.isInteger(item.number) || item.number < 1 || item.number > 6)
  ))) throw new Error("Invalid ranking history.");
  const numbers = saved.map(item => item.number).filter((x): x is number => x !== null);
  if (new Set(numbers).size !== numbers.length) throw new Error("Duplicate ranking numbers.");
  const { supabase } = await requireUser();
  const { data: rows, error } = await supabase.from("clips").select("id")
    .eq("project_id", projectId);
  if (error || !rows) throw new Error("Cannot load clips.");
  if (rows.length !== saved.length || rows.some(row => !saved.some(item => item.id === row.id))) {
    throw new Error("Ranking changed since this undo was created. Refresh before retrying.");
  }
  for (const item of saved) {
    const { error: clearError } = await supabase.from("clips")
      .update({ number: null }).eq("project_id", projectId).eq("id", item.id);
    if (clearError) throw new Error(clearError.message);
  }
  for (const item of saved) {
    const { error: updateError } = await supabase.from("clips")
      .update({ number: item.number }).eq("project_id", projectId).eq("id", item.id);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/preview`);
}

/** Split a scene into two non-destructive timeline entries referencing its original media. */
export async function splitScene(projectId: string, clipId: string, splitAt: number) {
  if (!Number.isFinite(splitAt)) throw new Error("Invalid split time.");
  const { supabase, user } = await requireUser();
  const { data: project } = await supabase.from("projects").select("format")
    .eq("id", projectId).eq("owner_id", user.id).single();
  if (!project) throw new Error("Project not found.");
  if (project.format === "ranking_list") throw new Error("Split is for Story and Title formats only.");
  const { data: scenes, error } = await supabase.from("clips")
    .select("id, title, number, storage_path, trim_start, trim_end, order_index")
    .eq("project_id", projectId).order("order_index", { ascending: true });
  if (error || !scenes) throw new Error(error?.message ?? "Scenes unavailable.");
  const source = scenes.find(scene => scene.id === clipId);
  if (!source || source.trim_start == null || source.trim_end == null ||
      splitAt <= source.trim_start + 0.1 || splitAt >= source.trim_end - 0.1) {
    throw new Error("Set a valid trim window and split at least 0.1s from both edges.");
  }
  const { data: second, error: insertError } = await supabase.from("clips").insert({
    owner_id: user.id, project_id: projectId, storage_path: source.storage_path,
    title: source.title + " · part 2", number: null,
    trim_start: splitAt, trim_end: source.trim_end,
    order_index: Math.max(0, ...scenes.map(scene => scene.order_index)) + 1,
  }).select("id").single();
  if (insertError || !second) throw new Error(insertError?.message ?? "Split failed.");
  const { error: trimError } = await supabase.from("clips").update({ trim_end: splitAt })
    .eq("id", source.id).eq("project_id", projectId);
  if (trimError) throw new Error("Second segment added; could not update the first segment: " + trimError.message);
  await moveClipToPosition(projectId, second.id, scenes.findIndex(scene => scene.id === clipId) + 1);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/preview`);
}

/** Reuse a video already uploaded within the same owned project. No duplicate upload needed. */
export async function reuseProjectMedia(projectId: string, clipId: string) {
  const { supabase, user } = await requireUser();
  const { data: project } = await supabase.from("projects").select("format")
    .eq("id", projectId).eq("owner_id", user.id).single();
  if (!project) throw new Error("Project not found.");
  const { data: scenes, error } = await supabase.from("clips")
    .select("id, title, storage_path, trim_start, trim_end, order_index")
    .eq("project_id", projectId).order("order_index", { ascending: true });
  if (error || !scenes) throw new Error(error?.message ?? "Media unavailable.");
  if (project.format === "ranking_list" && scenes.length >= 6) {
    throw new Error("Ranking supports at most six positions.");
  }
  const original = scenes.find(scene => scene.id === clipId);
  if (!original) throw new Error("Media not found.");
  const { error: addError } = await supabase.from("clips").insert({
    owner_id: user.id, project_id: projectId, storage_path: original.storage_path,
    title: original.title + " (reused)", number: null,
    trim_start: original.trim_start, trim_end: original.trim_end,
    order_index: Math.max(0, ...scenes.map(scene => scene.order_index)) + 1,
  });
  if (addError) throw new Error(addError.message);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/preview`);
}
