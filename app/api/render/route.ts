import path from "node:path";
import { addNarrationToMp4 } from "@/worker/narration";
import type { StudioRenderSettings } from "@/shared/studio-settings";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRankingRenderProps } from "@/lib/ranking-render-data";
import { getTitleBannerRenderProps } from "@/lib/title-banner-render-data";
import { getCaptionRenderProps } from "@/lib/caption-render-data";
import { RENDERS_DIR, renderCompositionLocally } from "@/worker/render";
import type { CompositionFormat } from "@/shared/types";
import { parseStudioSettings } from "@/shared/studio-settings";

const COMPOSITION_ID: Record<CompositionFormat, "RankingList" | "TitleBanner" | "Caption"> = {
  ranking_list: "RankingList",
  title_banner: "TitleBanner",
  caption: "Caption",
};

// Local rendering means headless Chromium + ffmpeg competing for the same CPU/GPU as everything
// else on this machine — running several at once (e.g. a batch render) would make all of them
// slower and risks starving the dev server itself. This chain serializes actual render work
// (jobs still get created and show "queued" immediately; each just waits its turn).
let renderQueue: Promise<void> = Promise.resolve();

async function getRenderPropsForFormat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  format: CompositionFormat,
  projectId: string,
) {
  if (format === "title_banner") return getTitleBannerRenderProps(supabase, projectId);
  if (format === "caption") return getCaptionRenderProps(supabase, projectId);
  return getRankingRenderProps(supabase, projectId);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId = body?.projectId as string | undefined;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, format")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const format = project.format as CompositionFormat;
  const qualityPreset = body?.qualityPreset === "high" || body?.qualityPreset === "small" ? body.qualityPreset as "high" | "small" : "balanced" as const;
  const studioSettings = parseStudioSettings(body?.studioSettings);
  if (body?.studioSettings != null && !studioSettings) {
    return NextResponse.json({ error: "Invalid studio settings" }, { status: 400 });
  }
  if (studioSettings?.music && studioSettings.musicTrack) {
    const track = studioSettings.musicTrack;
    if (!track.storagePath.startsWith(`${projectId}/music/`)) {
      return NextResponse.json({ error: "Music belongs to another project" }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from("clips").createSignedUrl(track.storagePath, 604800);
    if (error || !data) return NextResponse.json({ error: "Music file is unavailable. Import it again." }, { status: 400 });
    track.url = data.signedUrl;
  }
  const renderProps = await getRenderPropsForFormat(supabase, format, projectId);
  if (!renderProps) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (renderProps.clips.length === 0) {
    return NextResponse.json({ error: "Add at least one clip before rendering" }, { status: 400 });
  }

  const { data: job, error: insertError } = await supabase
    .from("jobs")
    .insert({ project_id: projectId, owner_id: user.id, status: "queued", progress: 0 })
    .select("id")
    .single();

  if (insertError || !job) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create job" },
      { status: 500 },
    );
  }

  // Deliberately not awaited: this Next.js server is a persistent local Node process (not a
  // Vercel serverless function, which is why heavy rendering is safe to run in-process here at
  // all — see CONTRIBUTING.md's "never run heavy renders on Vercel functions" guardrail). The
  // response returns immediately; the client polls `jobs` for progress (Supabase Realtime's
  // postgres_changes wasn't reliable for this locally, so we poll instead). Actual render work
  // is serialized via renderQueue, not run concurrently, even if several POSTs land close
  // together (batch renders).
  const propsWithSettings = studioSettings
    ? { ...renderProps, studioSettings }
    : renderProps;
  renderQueue = renderQueue.then(() =>
    runRender(format, projectId, job.id, propsWithSettings, qualityPreset).catch((err) => {
      console.error(`[render] job ${job.id} failed:`, err);
    }),
  );

  return NextResponse.json({ jobId: job.id });
}

async function runRender(
  format: CompositionFormat,
  projectId: string,
  jobId: string,
  renderProps: { projectName: string; clips: unknown[]; config: unknown; studioSettings?: StudioRenderSettings },
  qualityPreset: "high" | "balanced" | "small",
) {
  const supabase = await createClient();

  let lastWrittenProgress = 0;

  try {
    await supabase.from("jobs").update({ status: "rendering", progress: 0 }).eq("id", jobId);

    const inputProps = {
      projectName: renderProps.projectName,
      clips: renderProps.clips,
      config: renderProps.config,
      studioSettings: renderProps.studioSettings,
    };

    const outputLocation = await renderCompositionLocally({
      compositionId: COMPOSITION_ID[format],
      projectId,
      jobId,
      inputProps,
      qualityPreset,
      onProgress: (progress) => {
        if (progress - lastWrittenProgress < 0.05 && progress < 1) return;
        lastWrittenProgress = progress;
        supabase
          .from("jobs")
          .update({ progress, status: "rendering" })
          .eq("id", jobId)
          .then(() => {});
      },
    });

    if (renderProps.studioSettings?.script.trim()) {
      await addNarrationToMp4(outputLocation, renderProps.studioSettings);
    }

    const relativeOutputPath = path.relative(RENDERS_DIR, outputLocation);

    await supabase
      .from("jobs")
      .update({ status: "done", progress: 1, output_path: relativeOutputPath })
      .eq("id", jobId);
  } catch (err) {
    await supabase
      .from("jobs")
      .update({
        status: "error",
        error: err instanceof Error ? err.message : "Render failed",
      })
      .eq("id", jobId);
  }
}
