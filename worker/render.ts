import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";

// Rendering happens locally (no AWS/cloud) — see memory/DECISIONS.md. Output MP4s land directly
// on this machine's disk, not in Supabase Storage; `renders/` is gitignored.
export const RENDERS_DIR = path.join(process.cwd(), "renders");

// Bundling the Remotion project (webpack) takes several seconds — do it once per server
// process and reuse the bundle for every render, matching Remotion CLI's own behavior. All
// three compositions (RankingList, TitleBanner, Caption) live in the same registerRoot, so
// one bundle serves all of them.
let bundleLocationPromise: Promise<string> | null = null;

function getBundleLocation() {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
      onProgress: () => {},
    }).catch((error) => {
      // Failed bundle should not poison all later jobs for this process.
      bundleLocationPromise = null;
      throw error;
    });
  }
  return bundleLocationPromise;
}

// Letting selectComposition/renderMedia each open their own browser (the default when you don't
// pass puppeteerInstance) leaked a Chromium process per call — verified via `ps` after a 2-job
// batch render: 12 stray chrome-headless-shell processes, and the second job in the batch failed
// with "Session closed" (Page.bringToFront on an already-dead page). Sharing one long-lived
// browser instance across every render in this process fixes both the leak and the failure.
let browserPromise: ReturnType<typeof openBrowser> | null = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = openBrowser("chrome").catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

export function outputPathForJob(projectId: string, jobId: string) {
  return path.join(RENDERS_DIR, projectId, `${jobId}.mp4`);
}

export async function renderCompositionLocally(params: {
  compositionId: "RankingList" | "TitleBanner" | "Caption";
  projectId: string;
  jobId: string;
  inputProps: Record<string, unknown>;
  onProgress?: (progress: number) => void;
}) {
  const serveUrl = await getBundleLocation();
  const outputLocation = outputPathForJob(params.projectId, params.jobId);
  await fs.mkdir(path.dirname(outputLocation), { recursive: true });

  // If Chromium crashes, discard the cached instance and retry once with a fresh process.
  // Other errors (invalid clips, ffmpeg, assets) should fail clearly rather than looping.
  for (let attempt = 0; attempt < 2; attempt++) {
    const puppeteerInstance = await getBrowser();
    try {
      const composition = await selectComposition({
        serveUrl,
        id: params.compositionId,
        inputProps: params.inputProps,
        puppeteerInstance,
      });
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation,
        inputProps: params.inputProps,
        puppeteerInstance,
        onProgress: ({ progress }) => params.onProgress?.(progress),
      });
      return outputLocation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const browserLost = /Session closed|Target closed|Browser has disconnected|Connection closed|Protocol error.*closed/i.test(message);
      if (!browserLost) throw error;
      browserPromise = null;
      if (attempt === 1) throw error;
      params.onProgress?.(0);
      await fs.rm(outputLocation, { force: true }).catch(() => undefined);
    }
  }
  throw new Error("Render did not complete.");
}
