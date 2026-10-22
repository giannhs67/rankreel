export type ProjectIssue = { level: "error" | "warning" | "info"; id: string; message: string };
export type InspectedClip = { id: string; title: string; number: number | null; trim_start: number | null; trim_end: number | null };
export declare function inspectProject(args: {
  clips?: InspectedClip[];
  ranking?: boolean;
  settings?: Record<string, unknown> | null;
  licenses?: Record<string, { status?: string }>;
}): ProjectIssue[];
