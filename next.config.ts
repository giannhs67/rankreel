import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion's renderer/bundler packages select platform-specific native compositor binaries
  // via a runtime require() switch; bundling them statically breaks (tries to resolve every
  // platform's package, most of which aren't installed). Let Node's own require handle them.
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};

export default nextConfig;
