"use client";

import { useEffect, useState } from "react";
import type { RankingListConfig } from "@/remotion/ranking-config";

const injectedGoogleFonts = new Set<string>();

function injectGoogleFontLink(family: string) {
  if (injectedGoogleFonts.has(family)) return;
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(
    /%20/g,
    "+",
  )}:wght@400;700;800&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  injectedGoogleFonts.add(family);
}

/**
 * Ensures the font referenced by a RankingListConfig is actually loaded in the browser
 * (Google Fonts stylesheet, or a custom uploaded font via the FontFace API). Returns a
 * counter that increments every time a load completes — DOM text re-renders on its own once
 * a web font finishes loading, but canvas renderers (Konva) don't, so they should redraw off
 * a change in this value rather than treat it as a boolean "ready" flag.
 */
export function useLoadFont(config: RankingListConfig, customFontUrl: string | null): number {
  const [loadedVersion, setLoadedVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (config.font.source === "custom" && customFontUrl) {
          const face = new FontFace(config.font.family, `url(${customFontUrl})`);
          const loaded = await face.load();
          if (cancelled) return;
          document.fonts.add(loaded);
        } else {
          injectGoogleFontLink(config.font.googleFont);
          await document.fonts.load(`700 16px "${config.font.family}"`);
        }
      } catch {
        // Font failed to load (offline, bad file, etc.) — fall back silently to the
        // browser's default font rather than blocking the editor/preview from rendering.
      } finally {
        if (!cancelled) setLoadedVersion((v) => v + 1);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [config.font.source, config.font.family, config.font.googleFont, customFontUrl]);

  return loadedVersion;
}
