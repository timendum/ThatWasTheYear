import * as esbuild from "esbuild";
import { cpSync } from "node:fs";

await esbuild.build({
  entryPoints: ["./src/index.tsx"],
  bundle: true,
  outdir: "dist",
  format: "esm",
  target: "es2023",
  platform: "browser",
  sourcemap: "external",
  minify: true,
  jsx: "automatic",
});

cpSync("assets", "dist/", { recursive: true });
console.log("Build complete → dist/");
