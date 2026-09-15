import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sdfwa/ui"],
  output: "standalone",
  cacheComponents: true,
  turbopack: {
    // Turbopack refuses to resolve files outside its inferred project root
    // (see vercel/next.js#91896). Normally that's just this Digital-Services
    // monorepo. When SDWA_LOCAL_LINK=1 (see scripts/link-design-system.js),
    // @sdwa/components and @sdwa/tokens instead resolve through `bun link`'s
    // global store (~/.bun/install/global) to the sibling design-system
    // checkout, so the root needs to widen to cover that too.
    root: process.env.SDWA_LOCAL_LINK
      ? path.resolve(__dirname, "../../../../..")
      : path.resolve(__dirname, "../.."),
  },
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
