"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLoadFont } from "@/lib/use-load-font";
import { CURATED_GOOGLE_FONTS, type RankingListConfig } from "@/remotion/ranking-config";
import { applyTemplate, saveAsTemplate, updateTemplateConfig } from "./actions";

const KonvaCanvas = dynamic(() => import("./konva-canvas").then((m) => m.KonvaCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[640px] w-full max-w-[420px] items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-sm text-white/45">
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
  const modified = useRef(false);
  // Only save intentional edits, not the initial config or an applied template.
  useEffect(() => {
    if (!modified.current) return;
    const timer = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        await updateTemplateConfig(projectId, templateId, config);
        setSaveState("saved");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Autosave failed.");
        setSaveState("error");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config, projectId, templateId]);


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
    modified.current = true;
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
      modified.current = true;
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
      modified.current = false;
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#13161e] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-6 xl:sticky xl:top-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">01 / Layout</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Canvas preview</h2>
            <p className="mt-1 text-xs text-white/45">Drag the ranking text to reposition it.</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/70">9:16 VERTICAL</span>
        </div>

        <div className="mt-5 flex justify-center overflow-hidden rounded-[24px] border border-white/5 bg-[#090b11] px-2 py-6 sm:px-5">
          <div className="min-w-0 w-full max-w-[420px] rounded-[24px] border border-white/15 bg-[#040507] p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.6)]">
            <KonvaCanvas
              config={config}
              fontVersion={fontVersion}
              onPositionChange={(x, y) => update("position", { x, y })}
            />
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
          <span className="shrink-0 rounded-lg bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-300">DRAG</span>
          <p className="text-xs leading-5 text-white/60">
            This is a layout preview, not your final footage. The dark lower area will be replaced by uploaded video in the actual preview and MP4.
          </p>
        </div>
      </section>

      <section className="space-y-5 rounded-[28px] border border-white/10 bg-[#13161e] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.2)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">02 / Customization</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Design controls</h2>
            <p className="mt-1 text-xs text-white/45">Changes appear on the canvas immediately.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-[#212631] px-3 py-1.5 text-[11px] font-semibold text-white/60">STYLE</span>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#0d1017] p-4 sm:p-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-xs font-bold text-amber-400">01</span>
            <div>
              <h3 className="text-sm font-semibold">Typography</h3>
              <p className="text-xs text-white/40">Font, size and text outline</p>
            </div>
          </div>
          <label className="block space-y-2 text-xs font-medium text-white/70">
            <span>Font family</span>
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
              className="w-full rounded-xl border border-white/10 bg-[#20242e] px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400/70"
            >
              {CURATED_GOOGLE_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
              <option value="__custom__">Upload custom font…</option>
            </select>
          </label>
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
            <p className="text-xs text-white/55">
              {fontUploadBusy ? "Uploading font…" : "Custom font: " + config.font.family}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-3 text-xs font-medium text-white/70">
              <span className="flex items-center justify-between gap-2"><span>Font size</span><strong className="tabular-nums text-amber-300">{config.text.fontSize}px</strong></span>
              <input
                type="range"
                min={24}
                max={96}
                value={config.text.fontSize}
                onChange={(e) => update("text", { fontSize: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block space-y-3 text-xs font-medium text-white/70">
              <span className="flex items-center justify-between gap-2"><span>Outline width</span><strong className="tabular-nums text-amber-300">{config.text.strokeWidth}px</strong></span>
              <input
                type="range"
                min={0}
                max={8}
                value={config.text.strokeWidth}
                onChange={(e) => update("text", { strokeWidth: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1017] p-4 sm:p-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-xs font-bold text-amber-400">02</span>
            <div>
              <h3 className="text-sm font-semibold">Color palette</h3>
              <p className="text-xs text-white/40">Give each ranking a consistent look</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-2 text-xs font-medium text-white/70">
              <span>Base text</span>
              <input
                type="color"
                value={config.text.baseColor}
                onChange={(e) => update("text", { baseColor: e.target.value })}
                className="h-12 w-full cursor-pointer rounded-xl border border-white/15 bg-[#20242e] p-1.5"
              />
            </label>
            <label className="block space-y-2 text-xs font-medium text-white/70">
              <span>Active rank</span>
              <input
                type="color"
                value={config.text.currentColor}
                onChange={(e) => update("text", { currentColor: e.target.value })}
                className="h-12 w-full cursor-pointer rounded-xl border border-white/15 bg-[#20242e] p-1.5"
              />
            </label>
            <label className="block space-y-2 text-xs font-medium text-white/70">
              <span>Outline</span>
              <input
                type="color"
                value={config.text.strokeColor}
                onChange={(e) => update("text", { strokeColor: e.target.value })}
                className="h-12 w-full cursor-pointer rounded-xl border border-white/15 bg-[#20242e] p-1.5"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1017] p-4 sm:p-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-xs font-bold text-amber-400">03</span>
            <div>
              <h3 className="text-sm font-semibold">Entrance animation</h3>
              <p className="text-xs text-white/40">Choose how the ranking text appears</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <label className="block space-y-2 text-xs font-medium text-white/70">
              <span>Effect</span>
              <select
                value={config.animation.type}
                onChange={(e) => update("animation", { type: e.target.value as RankingListConfig["animation"]["type"] })}
                className="w-full rounded-xl border border-white/10 bg-[#20242e] px-3 py-3 text-sm capitalize text-white outline-none focus:border-amber-400/70"
              >
                {ANIMATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="block space-y-2 text-xs font-medium text-white/70">
              <span>Frames (30 fps)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={config.animation.durationInFrames}
                onChange={(e) => update("animation", { durationInFrames: Number(e.target.value) })}
                className="w-full rounded-xl border border-white/10 bg-[#20242e] px-3 py-3 text-sm text-white outline-none focus:border-amber-400/70"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="w-full rounded-xl bg-[#facc15] px-5 py-3.5 text-sm font-bold text-[#121212] transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
          >
            {saveState === "saving" ? "Saving design…" : saveState === "saved" ? "✓ Design saved" : "Save design"}
          </button>
          {saveState === "saved" && <p role="status" className="text-center text-xs text-emerald-400">Saved to this project.</p>}
          {error && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
          <p className="text-center text-xs text-white/40">Save before opening Video preview or exporting your MP4.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1017] p-4 sm:p-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-xs font-bold text-amber-400">04</span>
            <div>
              <h3 className="text-sm font-semibold">Reusable templates</h3>
              <p className="text-xs text-white/40">Save a style for future ranking videos</p>
            </div>
          </div>
          <label className="block space-y-2 text-xs font-medium text-white/70">
            <span>Template name</span>
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. Yellow Countdown"
              className="w-full rounded-xl border border-white/10 bg-[#20242e] px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/70"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            disabled={templateSaveBusy || !newTemplateName.trim()}
            className="w-full rounded-xl border border-white/15 bg-[#20242e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#303642] disabled:opacity-40"
          >
            {templateSaveBusy ? "Saving template…" : "Save as template"}
          </button>
          {templateSaveMessage && <p role="status" className="text-xs text-emerald-400">{templateSaveMessage}</p>}
          {savedTemplates.length > 0 && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <label className="block space-y-2 text-xs font-medium text-white/70">
                <span>Load saved template</span>
                <select
                  value={applyTemplateId}
                  onChange={(e) => setApplyTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#20242e] px-3 py-3 text-sm text-white outline-none focus:border-amber-400/70"
                >
                  <option value="">Choose a template…</option>
                  {savedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={applyBusy || !applyTemplateId}
                className="w-full rounded-xl border border-white/15 bg-[#20242e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#303642] disabled:opacity-40"
              >
                {applyBusy ? "Applying…" : "Apply template"}
              </button>
              <p className="text-xs leading-5 text-white/40">Applying a template saves it immediately. Further adjustments need Save design.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
