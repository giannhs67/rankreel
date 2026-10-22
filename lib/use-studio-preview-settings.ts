"use client";

import { useEffect, useState } from "react";
import { parseStudioSettings, type StudioRenderSettings } from "@/shared/studio-settings";

/** The preview must read the same saved settings submitted to the MP4 renderer. */
export function useStudioPreviewSettings(): StudioRenderSettings | null {
  const [settings, setSettings] = useState<StudioRenderSettings | null>(null);

  useEffect(() => {
    const projectId = window.location.pathname.split("/")[2];
    if (!projectId) return;
    const key = "short-tube-studio-" + projectId;

    function refresh() {
      try {
        const raw = localStorage.getItem(key);
        setSettings(raw ? parseStudioSettings(JSON.parse(raw)) : null);
      } catch {
        setSettings(null);
      }
    }

    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener(`short-tube-studio-saved-${projectId}`, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(`short-tube-studio-saved-${projectId}`, refresh);
    };
  }, []);

  return settings;
}
