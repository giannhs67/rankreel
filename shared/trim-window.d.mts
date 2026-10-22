export declare function resolveTrimWindow(start: number | null | undefined, end: number | null | undefined, fallbackSeconds?: number): { trimStartInSeconds: number; durationInSeconds: number };
export declare function trimStartFrame(clip: { trimStartInSeconds?: number }, fps: number): number;
