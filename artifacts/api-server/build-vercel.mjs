import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");

async function buildVercel() {
  const apiDir = path.resolve(rootDir, "api");

  // Clean previous builds
  for (const f of ["index.js", "cron.js"]) {
    await rm(path.resolve(apiDir, f), { force: true });
  }

  const shared = {
    platform: "node",
    bundle: true,
    format: "esm",
    logLevel: "info",
    external: [
      "*.node",
      "pg-native",
    ],
    banner: {
      js: `import { createRequire as __crReq } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);
`,
    },
  };

  // Build API handler
  await esbuild({
    ...shared,
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    outfile: path.resolve(apiDir, "index.js"),
  });

  // Build Cron handler
  await esbuild({
    ...shared,
    entryPoints: [path.resolve(artifactDir, "src/vercel-cron.ts")],
    outfile: path.resolve(apiDir, "cron.js"),
  });
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
