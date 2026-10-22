export type TimedCaption = { start: number; end: number; text: string };

export function parseTimedCaptions(input: unknown): TimedCaption[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).flatMap((value): TimedCaption[] => {
    if (!value || typeof value !== "object") return [];
    const v = value as Record<string, unknown>;
    if (typeof v.start !== "number" || typeof v.end !== "number" ||
        !Number.isFinite(v.start) || !Number.isFinite(v.end) ||
        v.start < 0 || v.end <= v.start || v.end > 7200 ||
        typeof v.text !== "string" || !v.text.trim() || v.text.length > 240) return [];
    return [{ start: v.start, end: v.end, text: v.text.trim() }];
  }).sort((a, b) => a.start - b.start);
}

export function parseSrt(source: string): TimedCaption[] {
  const toSeconds = (value: string) => {
    const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
    return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000 : NaN;
  };
  const blocks = source.replace(/\r/g, "").trim().split(/\n\s*\n/);
  return parseTimedCaptions(blocks.map(block => {
    const lines = block.split("\n"), index = lines.findIndex(line => line.includes(" --> "));
    if (index < 0) return null;
    const [first, last] = lines[index].split(/\s+-->\s+/);
    return { start: toSeconds(first), end: toSeconds(last),
      text: lines.slice(index + 1).join(" ").replace(/<[^>]+>/g, "").trim() };
  }));
}
