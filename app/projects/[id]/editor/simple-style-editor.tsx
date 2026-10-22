"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLoadFont } from "@/lib/use-load-font";
import { CURATED_GOOGLE_FONTS } from "@/remotion/ranking-config";
import type { TitleBannerConfig } from "@/remotion/title-banner-config";
import type { CaptionConfig } from "@/remotion/caption-config";
import { updateTemplateConfig } from "./actions";

const ANIMATIONS = ["none", "fade", "slide", "pop"] as const;

type Config = TitleBannerConfig | CaptionConfig;

// Title Banner and Caption share the same font/position/animation shape (see
// remotion/title-banner-config.ts and remotion/caption-config.ts) and only differ in their
// `text` fields (stroke vs. background pill) — this editor branches on `format` for just that
// one section rather than needing two nearly-identical components. Deliberately simpler than
// the Ranking List editor: numeric X/Y inputs instead of a Konva drag canvas, and no
// save-as-template library yet — see memory/DECISIONS.md for the scope call.
export function SimpleStyleEditor({
  format,
  projectId,
  templateId,
  initialConfig,
  initialCustomFontUrl,
}: {
  format: "title_banner" | "caption";
  projectId: string;
  templateId: string;
  initialConfig: Config;
  initialCustomFontUrl: string | null;
}) {
  const [config, setConfig] = useState<Config>(initialConfig);
  const [customFontUrl, setCustomFontUrl] = useState(initialCustomFontUrl);
  const [fontUploadBusy, setFontUploadBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useLoadFont(
    {
      font: config.font,
      text: { fontSize: 0, baseColor: "", currentColor: "", strokeColor: "", strokeWidth: 0 },
      position: config.position,
      animation: config.animation,
    },
    customFontUrl,
  );

  function update<K extends keyof Config>(key: K, patch: Partial<Config[K]>) {
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

  return (
    <div className="max-w-xl space-y-5">
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
          <label className="mb-1 block text-sm font-medium">
            Font size ({config.text.fontSize}px)
          </label>
          <input
            type="range"
            min={24}
            max={120}
            value={config.text.fontSize}
            onChange={(e) => update("text", { fontSize: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {format === "title_banner" ? (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Stroke width ({(config as TitleBannerConfig).text.strokeWidth}px)
            </label>
            <input
              type="range"
              min={0}
              max={8}
              value={(config as TitleBannerConfig).text.strokeWidth}
              onChange={(e) => update("text", { strokeWidth: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">Background</label>
            <input
              type="color"
              value={rgbaToHex((config as CaptionConfig).text.backgroundColor)}
              onChange={(e) => update("text", { backgroundColor: e.target.value })}
              className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Text color</label>
          <input
            type="color"
            value={config.text.color}
            onChange={(e) => update("text", { color: e.target.value })}
            className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
          />
        </div>

        {format === "title_banner" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Stroke color</label>
            <input
              type="color"
              value={(config as TitleBannerConfig).text.strokeColor}
              onChange={(e) => update("text", { strokeColor: e.target.value })}
              className="h-9 w-full rounded-md border border-black/15 dark:border-white/15"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Position X (px)</label>
          <input
            type="number"
            value={config.position.x}
            onChange={(e) => update("position", { x: Number(e.target.value) })}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Position Y (px)</label>
          <input
            type="number"
            value={config.position.y}
            onChange={(e) => update("position", { y: Number(e.target.value) })}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-black/40 dark:text-white/40">
        Frame is 1080×1920 — no drag canvas for this format yet, positions are numeric.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Entrance animation</label>
        <div className="flex gap-2">
          <select
            value={config.animation.type}
            onChange={(e) =>
              update("animation", {
                type: e.target.value as Config["animation"]["type"],
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
            onChange={(e) => update("animation", { durationInFrames: Number(e.target.value) })}
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
    </div>
  );
}

function rgbaToHex(rgba: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(rgba)) return rgba;
  if (/^#[0-9a-fA-F]{3}$/.test(rgba)) return "#" + [...rgba.slice(1)].map(ch => ch + ch).join("");
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  const [, r, g, b] = match;
  return (
    "#" +
    [r, g, b]
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("")
  );
}
