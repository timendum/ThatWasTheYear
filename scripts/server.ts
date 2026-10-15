/// Utility http server to serve updated resources without a build step.

import * as esbuild from "esbuild";
import { reactCompilerPlugin } from "./lib/react-compiler-plugin";

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(Bun.file("assets/index.html"), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/index.js") {
      const result = await esbuild.build({
        entryPoints: ["./src/index.tsx"],
        bundle: true,
        write: false,
        format: "esm",
        target: "es2023",
        platform: "browser",
        jsx: "automatic",
        plugins: [reactCompilerPlugin()],
      });
      return new Response(result.outputFiles[0].text, {
        headers: { "content-type": "application/javascript" },
      });
    }

    if (url.pathname.slice(1).split("/").length === 1) {
      const path = "assets/" + url.pathname.slice(1);
      if (await Bun.file(path).exists()) {
        const ext = url.pathname.split(".").pop();
        const mimeTypes: Record<string, string> = {
          css: "text/css",
          js: "application/javascript",
          json: "application/json",
          png: "image/png",
          svg: "image/svg+xml",
          html: "text/html",
        };
        return new Response(Bun.file(path), {
          headers: {
            "content-type": mimeTypes[ext ?? ""] ?? "application/octet-stream",
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running at http://localhost:3000");
