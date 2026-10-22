import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseSrt } from "@/shared/timed-captions";

function run(program: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let errorText = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Transcription timed out.")); }, timeoutMs);
    child.stderr.on("data", (chunk: Buffer) => { errorText = (errorText + chunk.toString()).slice(-2000); });
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.on("close", code => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error("Local transcription failed: " + errorText.slice(-600)));
    });
  });
}

/**
 * Offline Whisper.cpp bridge: requires WHISPER_CLI_PATH, WHISPER_MODEL_PATH and FFmpeg
 * on the Windows host. No speech data is sent to a third-party AI provider.
 */
export async function transcribeMediaLocally(bytes: Uint8Array) {
  const whisper = process.env.WHISPER_CLI_PATH;
  const model = process.env.WHISPER_MODEL_PATH;
  if (!whisper || !model) {
    throw new Error("Offline AI transcription is not configured. Set WHISPER_CLI_PATH and WHISPER_MODEL_PATH on the local PC.");
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "short-tube-whisper-"));
  try {
    const input = path.join(dir, "source");
    const wav = path.join(dir, "audio.wav");
    const out = path.join(dir, "captions");
    await fs.writeFile(input, bytes);
    await run(process.env.FFMPEG_PATH || "ffmpeg",
      ["-nostdin", "-y", "-i", input, "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", wav], 180000);
    await run(whisper, ["-m", model, "-f", wav, "-osrt", "-of", out], 600000);
    const srt = await fs.readFile(out + ".srt", "utf8");
    return parseSrt(srt);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
