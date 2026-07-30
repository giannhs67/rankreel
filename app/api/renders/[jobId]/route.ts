import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RENDERS_DIR } from "@/worker/render";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, output_path, project_id")
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "done" || !job.output_path) {
    return NextResponse.json({ error: "Render not available" }, { status: 404 });
  }

  // output_path is stored relative to RENDERS_DIR (see app/api/render/route.ts) — resolve and
  // make sure it can't escape that directory.
  const filePath = path.join(RENDERS_DIR, job.output_path);
  if (!filePath.startsWith(RENDERS_DIR)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) {
    return NextResponse.json({ error: "Render file missing on disk" }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="rankreel-${job.project_id}-${job.id}.mp4"`,
    },
  });
}
