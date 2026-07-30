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

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              href={`/projects/${project.id}`}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              ← {project.name}
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Style editor</h1>
          </div>
          <Link
            href={`/projects/${project.id}/preview`}
            className="shrink-0 rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            Live preview →
          </Link>
        </div>

        {editor}
      </main>
    </div>
  );
}
