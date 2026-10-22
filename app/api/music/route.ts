import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { prepareMusic } from "@/worker/music-import";
export const runtime = "nodejs";
const busy = new Set<string>();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 42 * 1024 * 1024) return NextResponse.json({ error: "Audio must be under 40 MB." }, { status: 413 });
  if (busy.has(user.id)) return NextResponse.json({ error: "A music import is already running." }, { status: 409 });
  busy.add(user.id);
  try {
    const form = await request.formData();
    const projectId = String(form.get("projectId") ?? "");
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).single();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const existing = form.get("storagePath");
    if (typeof existing === "string" && new RegExp(`^${projectId}/music/[a-f0-9-]{36}\\.(mp3|wav|m4a|ogg)$`).test(existing)) {
      const { data, error } = await supabase.storage.from("clips").createSignedUrl(existing, 604800);
      if (error) throw error;
      return NextResponse.json({ url: data.signedUrl });
    }
    if (form.get("rightsConfirmed") !== "true") return NextResponse.json({ error: "Confirm that you have permission to use the audio." }, { status: 400 });
    const value = form.get("file");
    const music = await prepareMusic(value instanceof File ? value : null, String(form.get("youtube") ?? ""));
    const storagePath = `${projectId}/music/${randomUUID()}.${music.ext}`;
    const types: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg" };
    const { error } = await supabase.storage.from("clips").upload(storagePath, music.bytes, { contentType: types[music.ext] });
    if (error) throw error;
    const { data, error: signingError } = await supabase.storage.from("clips").createSignedUrl(storagePath, 604800);
    if (signingError) throw signingError;
    return NextResponse.json({ storagePath, url: data.signedUrl, title: music.title, duration: music.duration,
      sourceStart: 0, sourceEnd: Math.min(30, music.duration), videoStart: 0 });
  } catch (error) {
    console.error("[music]", error);
    return NextResponse.json({ error: "Music import failed. For YouTube, install yt-dlp and FFmpeg on the host PC. The video must be public and available. You can also upload an audio file (under 40 MB, up to 15 minutes)." }, { status: 400 });
  } finally { busy.delete(user.id); }
}
