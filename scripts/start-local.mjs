import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Please install Node.js 22 or newer.");
  process.exit(1);
}

if (!fs.existsSync(".env.local")) {
  fs.copyFileSync(".env.example", ".env.local");
  console.log("Created .env.local. Follow SETUP-EL.md and fill in your Supabase keys locally.");
  process.exit(1);
}

process.loadEnvFile(".env.local");
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Fill in these fields in .env.local: ${missing.join(", ")}. See SETUP-EL.md.`);
  process.exit(1);
}
try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error();
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL.");
  process.exit(1);
}

function npm(args) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error || result.status !== 0) {
    console.error("The command failed. Keep this window open to inspect the error.");
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync("node_modules/next/package.json")) npm(["ci"]);
console.log("Open http://localhost:3000 after Next.js says Ready. Keep this window open. Ctrl+C stops the app.");
npm(["run", "dev", "--", "--hostname", "127.0.0.1"]);
