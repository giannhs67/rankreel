import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { StudioRenderSettings } from "@/shared/studio-settings";

function run(exe: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr = (stderr + String(chunk)).slice(-3000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${exe} exited ${code}: ${stderr}`)));
  });
}

/**
 * Offline narration using the Windows System.Speech engine.
 * No cloud API, credits, or user secrets. Available voices depend on Windows installation.
 * Keeps the original video audio at reduced volume under narration.
 */
export async function addNarrationToMp4(outputPath: string, settings: StudioRenderSettings) {
  if (!settings.script.trim()) return;
  if (process.platform !== "win32") {
    throw new Error("Offline narration currently requires Windows and its installed speech voices.");
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "short-tube-tts-"));
  const wav = path.join(tempDir, "narration.wav");
  const rendered = path.join(tempDir, "narrated.mp4");
  try {
    const scriptFile = path.join(tempDir, "script.txt");
    await fs.writeFile(scriptFile, settings.script, "utf8");
    const ps = [
      "param([string]$wav,[string]$txt,[int]$rate)",
      "Add-Type -AssemblyName System.Speech",
      "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      "$s.SetOutputToWaveFile($wav)",
      "$s.Rate = $rate",
      "$s.Speak([System.IO.File]::ReadAllText($txt))",
      "$s.Dispose()",
    ].join("; ");
    const rate = settings.voice === "energetic" ? "2" : settings.voice === "deep" ? "-2" : "0";
    const psFile = path.join(tempDir, "narrate.ps1");
    await fs.writeFile(psFile, ps, "utf8");
    await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile, wav, scriptFile, rate]);
    // Mix the original clip audio quietly under narration when an audio stream exists.
    // Videos without audio still render with narration alone.
    const hasOriginalAudio = await new Promise<boolean>((resolve, reject) => {
      const child = spawn("ffprobe", [
        "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=index", "-of", "csv=p=0", outputPath,
      ], { windowsHide: true });
      let stdout = "";
      child.stdout.on("data", chunk => { stdout += String(chunk); });
      child.on("error", reject);
      child.on("close", code => code === 0
        ? resolve(stdout.trim().length > 0)
        : reject(new Error("ffprobe failed while checking source audio")));
    });
    const filter = hasOriginalAudio
      ? "[0:a]volume=0.18[original];[1:a]apad[narration];[original][narration]amix=inputs=2:duration=longest:normalize=0[a]"
      : "[1:a]apad[a]";
    await run("ffmpeg", [
      "-y", "-i", outputPath, "-i", wav,
      "-filter_complex", filter,
      "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac",
      "-shortest", rendered,
    ]);
    await fs.copyFile(rendered, outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
