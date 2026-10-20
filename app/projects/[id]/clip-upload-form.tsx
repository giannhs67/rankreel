"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addClip } from "./actions";

/** Reads a video file's real duration in the browser without uploading it first. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

export function ClipUploadForm({ projectId, nextRankingNumber }: { projectId: string; nextRankingNumber: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") ?? "").trim();
    const numberRaw = String(formData.get("number") ?? "").trim();

    if (!file || file.size === 0) {
      setError("Choose a video file to upload.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const durationInSeconds = await readVideoDuration(file);

      const supabase = createClient();
      const ext = file.name.split(".").pop() || "mp4";
      const storagePath = `${projectId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("clips")
        .upload(storagePath, file, { contentType: file.type || "video/mp4" });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      await addClip({
        projectId,
        storagePath,
        title,
        number: numberRaw === "" ? null : Number(numberRaw),
        durationInSeconds,
      });

      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="title"
          placeholder="Scene title / on-screen text"
          required
          className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
        <input
          name="number"
          type="number"
          placeholder={nextRankingNumber ? "Rank" : "Rank (optional)"}
          min={1}
          max={99}
          defaultValue={nextRankingNumber || undefined}
          key={nextRankingNumber}
          className="w-full rounded-md border sm:w-24 border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
      </div>
      <input
        name="file"
        type="file"
        accept="video/*"
        required
        className="w-full text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Uploading…" : "Upload clip"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
