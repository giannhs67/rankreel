import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { resolveRankingConfig } from "@/remotion/ranking-config";
import { resolveTitleBannerConfig } from "@/remotion/title-banner-config";
import { resolveCaptionConfig } from "@/remotion/caption-config";
import type { CompositionFormat } from "@/shared/types";
import { TemplateEditor } from "./template-editor";
import { SimpleStyleEditor } from "./simple-style-editor";

const CUSTOM_FONT_URL_TTL_SECONDS = 60 * 60;

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, template_id, format")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const format = project.format as CompositionFormat;

  let template: { id: string; config_json: Record<string, unknown> } | null = null;

  if (project.template_id) {
    const { data } = await supabase
      .from("templates")
      .select("id, config_json")
      .eq("id", project.template_id)
      .single();
    template = data;
  }

  if (!template) {
    const { data: created, error } = await supabase
      .from("templates")
      .insert({
        owner_id: user.id,
        name: `${project.name} style`,
        format,
        config_json: {},
      })
      .select("id, config_json")
      .single();

    if (error || !created) {
      throw new Error(error?.message ?? "Failed to create template");
    }

    await supabase.from("projects").update({ template_id: created.id }).eq("id", project.id);
    template = created;
  }

  let customFontUrl: string | null = null;

  async function signCustomFont(path: string | null) {
    if (!path) return null;
    const { data: signed } = await supabase.storage
      .from("fonts")
      .createSignedUrl(path, CUSTOM_FONT_URL_TTL_SECONDS);
    return signed?.signedUrl ?? null;
  }

  let editor: React.ReactNode;

  if (format === "ranking_list") {
    const config = resolveRankingConfig(template.config_json);
    if (config.font.source === "custom") {
      customFontUrl = await signCustomFont(config.font.customFontPath);
    }

    const { data: savedTemplates } = await supabase
      .from("templates")
      .select("id, name")
      .eq("format", "ranking_list")
      .neq("id", template.id)
      .order("created_at", { ascending: false });

    editor = (
      <TemplateEditor
        projectId={project.id}
        templateId={template.id}
        initialConfig={config}
        initialCustomFontUrl={customFontUrl}
        savedTemplates={savedTemplates ?? []}
      />
    );
  } else if (format === "title_banner") {
    const config = resolveTitleBannerConfig(template.config_json);
    if (config.font.source === "custom") {
      customFontUrl = await signCustomFont(config.font.customFontPath);
    }
    editor = (
      <SimpleStyleEditor
        format="title_banner"
        projectId={project.id}
        templateId={template.id}
        initialConfig={config}
        initialCustomFontUrl={customFontUrl}
      />
    );
  } else {
    const config = resolveCaptionConfig(template.config_json);
    if (config.font.source === "custom") {
      customFontUrl = await signCustomFont(config.font.customFontPath);
    }
    editor = (
      <SimpleStyleEditor
        format="caption"
        projectId={project.id}
        templateId={template.id}
        initialConfig={config}
        initialCustomFontUrl={customFontUrl}
      />
    );
  }

  const isRanking = format === "ranking_list";

  return (
    <div className={isRanking ? "min-h-screen bg-[#0a0b0e] text-white" : "min-h-screen"}>
      <div className={isRanking ? "[&_header]:border-white/10 [&_header]:bg-[#101218] [&_header_span]:text-white/60 [&_header_button]:border-white/20" : ""}>
        <AppHeader email={user.email ?? ""} />
      </div>
      <main className={isRanking ? "mx-auto max-w-[1460px] space-y-7 px-4 py-6 sm:px-8 sm:py-9" : "mx-auto max-w-4xl space-y-6 p-6"}>
        {isRanking ? (
          <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href={`/projects/${project.id}`} className="text-sm text-white/50 transition hover:text-amber-300">
                ← Back to {project.name}
              </Link>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-400">Short Tube / Ranking Studio</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Make every rank count.</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                Design your countdown, fine-tune typography, and save a reusable look.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-white/65">9:16 · 1080 × 1920</span>
              <Link href={`/projects/${project.id}/preview`} className="rounded-xl bg-[#facc15] px-5 py-3 text-sm font-bold text-[#141414] transition hover:bg-amber-300">
                Video preview ↗
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href={`/projects/${project.id}`} className="text-sm text-black/50 hover:underline dark:text-white/50">← {project.name}</Link>
              <h1 className="mt-1 text-xl font-semibold">Style editor</h1>
            </div>
            <Link href={`/projects/${project.id}/preview`} className="shrink-0 rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15">Live preview →</Link>
          </div>
        )}
        {editor}
      </main>
    </div>
  );
}
