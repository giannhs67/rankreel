import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeMediaLocally } from "@/worker/whisper-transcribe";
export const runtime = "nodejs";

const busyUsers = new Set<string>();
const MAX_BYTES = 95 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const clipId = typeof body?.clipId === "string" ? body.clipId : "";
  if (!projectId || !clipId) return NextResponse.json({ error: "Missing project and clip." }, { status: 400 });
  if (busyUsers.has(user.id)) return NextResponse.json({ error: "A transcription is already running." }, { status: 409 });
  const { data: project } = await supabase.from("projects").select("id")
    .eq("id", projectId).eq("owner_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const { data: scenes, error: scenesError } = await supabase.from("clips")
    .select("id, storage_path, trim_start, trim_end").eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (scenesError || !scenes) return NextResponse.json({ error: "Could not load scenes." }, { status: 500 });
  const index = scenes.findIndex(scene => scene.id === clipId);
  if (index < 0) return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  busyUsers.add(user.id);
  try {
    const clip = scenes[index];
    const { data: signed, error } = await supabase.storage.from("clips").createSignedUrl(clip.storage_path, 900);
    if (error || !signed) throw new Error("Could not access the clip.");
    const response = await fetch(signed.signedUrl);
    if (!response.ok) throw new Error("Could not download the clip for local transcription.");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BYTES) throw new Error("Video exceeds the 95 MB limit.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error("Video exceeds the 95 MB offline transcription limit.");
    const transcription = await transcribeMediaLocally(bytes);
    const timelineStart = scenes.slice(0, index)
      .reduce((sum, scene) => sum + ((scene.trim_end != null && scene.trim_start != null)
        ? Math.max(0, scene.trim_end - scene.trim_start) : 4), 0);
    const start = clip.trim_start ?? 0;
    const end = clip.trim_end ?? Number.POSITIVE_INFINITY;
    const captions = transcription.filter(line => line.end > start && line.start < end)
      .map(line => ({
        start: Math.max(0, line.start - start) + timelineStart,
        end: Math.min(line.end, end) - start + timelineStart,
        text: line.text,
      })).filter(line => line.end > line.start).slice(0, 200);
    return NextResponse.json({ captions, clipId, timelineStart });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transcription failed." }, { status: 400 });
  } finally {
    busyUsers.delete(user.id);
  }
}
