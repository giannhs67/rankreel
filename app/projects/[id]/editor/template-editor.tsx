"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLoadFont } from "@/lib/use-load-font";
import { CURATED_GOOGLE_FONTS, type RankingListConfig } from "@/remotion/ranking-config";
import { applyTemplate, saveAsTemplate, updateTemplateConfig } from "./actions";

const KonvaCanvas = dynamic(() => import("./konva-canvas").then((m) => m.KonvaCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[640px] w-[360px] items-center justify-center rounded-lg border border-black/10 text-sm text-black/40 dark:border-white/10 dark:text-white/40">
      Loading canvas…
    </div>
  ),
});

const ANIMATIONS: RankingListConfig["animation"]["type"][] = ["none", "fade", "slide", "pop"];

export function TemplateEditor({
  projectId,
  templateId,
  initialConfig,
  initialCustomFontUrl,
  savedTemplates,
}: {
  projectId: string;
  templateId: string;
  initialConfig: RankingListConfig;
  initialCustomFontUrl: string | null;
  savedTemplates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [customFontUrl, setCustomFontUrl] = useState(initialCustomFontUrl);
  const [fontUploadBusy, setFontUploadBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateSaveBusy, setTemplateSaveBusy] = useState(false);
  const [templateSaveMessage, setTemplateSaveMessage] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);

  const fontVersion = useLoadFont(config, customFontUrl);

  function update<K extends keyof RankingListConfig>(
    key: K,
    patch: Partial<RankingListConfig[K]>,
  ) {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaveState("idle");
  }

  async function handleFontUpload(file: File) {
    setFontUploadBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "ttf";
      const path = `${projectId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("fonts")
        .upload(path, file, { contentType: file.type || "font/ttf" });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data: signed, error: signError } = await supabase.storage
        .from("fonts")
        .createSignedUrl(path, 60 * 60);
      if (signError || !signed) {
        setError(signError?.message ?? "Failed to sign uploaded font URL.");
        return;
      }

      const family = `custom-${path.split("/").pop()?.split(".")[0]?.slice(0, 12)}`;
      setCustomFontUrl(signed.signedUrl);
      setConfig((prev) => ({
        ...prev,
        font: { ...prev.font, source: "custom", customFontPath: path, family },
      }));
      setSaveState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Font upload failed.");
    } finally {
      setFontUploadBusy(false);
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setError(null);
    try {
      await updateTemplateConfig(projectId, templateId, config);
      setSaveState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaveState("error");
    }
  }

  async function handleSaveAsTemplate() {
    setTemplateSaveBusy(true);
    setTemplateSaveMessage(null);
    setError(null);
    try {
      await saveAsTemplate(projectId, newTemplateName, config);
      setNewTemplateName("");
      setTemplateSaveMessage(`Saved as "${newTemplateName.trim()}".`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setTemplateSaveBusy(false);
    }
  }

  async function handleApplyTemplate() {
    if (!applyTemplateId) return;
    setApplyBusy(true);
    setError(null);
    try {
      const applied = await applyTemplate(projectId, templateId, applyTemplateId);
      setConfig(applied);

      if (applied.font.source === "custom" && applied.font.customFontPath) {
        const supabase = createClient();
        const { data: signed } = await supabase.storage
          .from("fonts")
          .createSignedUrl(applied.font.customFontPath, 60 * 60);
        setCustomFontUrl(signed?.signedUrl ?? null);
      } else {
        setCustomFontUrl(null);
      }

      setSaveState("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply template.");
    } finally {
      setApplyBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="shrink-0">
        <KonvaCanvas
          config={config}
          fontVersion={fontVersion}
          onPositionChange={(x, y) => update("position", { x, y })}
        />
        <p className="mt-2 max-w-[360px] text-xs text-black/40 dark:text-white/40">
          Drag the sample text to position the ranking list. Dark area = top zone, black area =
          where the clip plays.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Font</label>
          <select
            value={config.font.source === "custom" ? "__custom__" : config.font.googleFont}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "__custom__") {
                fileInputRef.current?.click();
                return;
              }
              update("font", { source: "google", googleFont: value, family: value });
            }}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            {CURATED_GOOGLE_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value="__custom__">Custom font…</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFontUpload(file);
              e.target.value = "";
            }}
          />
          {config.font.source === "custom" && (
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              {fontUploadBusy ? "Uploading…" : `Using custom font (${config.font.family})`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Font size ({config.text.fontSize}px)</label>
            <input
              type="range"
              min={24}
              max={96}
              value={config.text.fontSize}
              onChange={(e) => update("text", { fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Stroke width ({config.text.strokeWidth}px)</label>
            <input
              type="range"
              min={0}
              max={8}
              value={config.text.strokeWidth}
              onChange={(e) => update("text", { strokeWidth: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Text color</label>
            <input
              type="color"
              value={config.text.baseColor}
              onChange={(e) => update("text", { baseColor: e.target.value })}
              className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Current-item color</label>
            <input
              type="color"
              value={config.text.currentColor}
              onChange={(e) => update("text", { currentColor: e.target.value })}
              className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Stroke color</label>
            <input
              type="color"
              value={config.text.strokeColor}
              onChange={(e) => update("text", { strokeColor: e.target.value })}
              className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Entrance animation</label>
          <div className="flex gap-2">
            <select
              value={config.animation.type}
              onChange={(e) =>
                update("animation", {
                  type: e.target.value as RankingListConfig["animation"]["type"],
                })
              }
              className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm capitalize dark:border-white/15"
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={60}
              value={config.animation.durationInFrames}
              onChange={(e) =>
                update("animation", { durationInFrames: Number(e.target.value) })
              }
              className="w-24 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              title="Duration in frames (30fps)"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {saveState === "saving" ? "Saving…" : "Save changes"}
          </button>
          {saveState === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
          )}
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>

        <div className="space-y-3 border-t border-black/10 pt-5 dark:border-white/10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Templates
          </h2>

          <div>
            <label className="mb-1 block text-sm font-medium">Save this look as a template</label>
            <div className="flex gap-2">
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name, e.g. Neon Countdown"
                className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={templateSaveBusy || !newTemplateName.trim()}
                className="shrink-0 rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-60 dark:border-white/15"
              >
                {templateSaveBusy ? "Saving…" : "Save as template"}
              </button>
            </div>
            {templateSaveMessage && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">{templateSaveMessage}</p>
            )}
          </div>

          {savedTemplates.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Apply a saved template</label>
              <div className="flex gap-2">
                <select
                  value={applyTemplateId}
                  onChange={(e) => setApplyTemplateId(e.target.value)}
                  className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                >
                  <option value="">Choose a template…</option>
                  {savedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  disabled={applyBusy || !applyTemplateId}
                  className="shrink-0 rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-60 dark:border-white/15"
                >
                  {applyBusy ? "Applying…" : "Apply"}
                </button>
              </div>
              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                Applies and saves immediately to this project — further tweaks below still need
                their own &quot;Save changes&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
