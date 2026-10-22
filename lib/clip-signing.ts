import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTrimWindow } from "@/shared/trim-window.mjs";

// Fallback only for clips uploaded before duration capture existed (trim_start/trim_end unset).
const DEFAULT_CLIP_SECONDS = 4;
const CLIP_SIGNED_URL_TTL_SECONDS = 60 * 30;
const FONT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export type SignedClip = {
  id: string;
  title: string;
  number: number | null;
  videoUrl: string;
  durationInSeconds: number;
  trimStartInSeconds: number;
};

/** Every clip in a project, each with a fresh signed Storage URL and its real (or best-guess) duration. */
export async function getSignedClipsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<SignedClip[]> {
  const { data: clipRows } = await supabase
    .from("clips")
    .select("id, title, number, storage_path, trim_start, trim_end")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  const clips: SignedClip[] = [];
  for (const clip of clipRows ?? []) {
    const { data: signed } = await supabase.storage
      .from("clips")
      .createSignedUrl(clip.storage_path, CLIP_SIGNED_URL_TTL_SECONDS);
    if (!signed) continue;

    const { trimStartInSeconds, durationInSeconds } = resolveTrimWindow(clip.trim_start, clip.trim_end, DEFAULT_CLIP_SECONDS);

    clips.push({
      id: clip.id,
      title: clip.title,
      number: clip.number,
      videoUrl: signed.signedUrl,
      durationInSeconds,
      trimStartInSeconds,
    });
  }

  return clips;
}

export async function getCustomFontSignedUrl(
  supabase: SupabaseClient,
  customFontPath: string | null,
): Promise<string | null> {
  if (!customFontPath) return null;
  const { data: signed } = await supabase.storage
    .from("fonts")
    .createSignedUrl(customFontPath, FONT_SIGNED_URL_TTL_SECONDS);
  return signed?.signedUrl ?? null;
}
