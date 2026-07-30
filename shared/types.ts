export type CompositionFormat = "ranking_list" | "title_banner" | "caption";

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  template_id: string | null;
  format: CompositionFormat;
  created_at: string;
  updated_at: string;
};

export type Clip = {
  id: string;
  project_id: string;
  owner_id: string;
  order_index: number;
  storage_path: string;
  title: string;
  number: number | null;
  trim_start: number | null;
  trim_end: number | null;
  created_at: string;
};

export type Template = {
  id: string;
  owner_id: string;
  name: string;
  format: CompositionFormat;
  config_json: Record<string, unknown>;
  created_at: string;
};

export type Job = {
  id: string;
  project_id: string;
  owner_id: string;
  status: "queued" | "rendering" | "done" | "error";
  progress: number;
  output_path: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};
