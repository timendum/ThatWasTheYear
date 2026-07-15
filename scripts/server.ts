/// Utility http server to serve updated resources without a build step.

import * as esbuild from "esbuild";

Deno.serve({ port: 3000 }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    const body = await Deno.readFile("assets/index.html");
    return new Response(body, {
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
    });
    return new Response(result.outputFiles[0].text, {
      headers: { "content-type": "application/javascript" },
    });
  }

  if (url.pathname.slice(1).split("/").length === 1) {
    try {
      const body = await Deno.readFile("assets/" + url.pathname.slice(1));
      const ext = url.pathname.split(".").pop();
      const mimeTypes: Record<string, string> = {
        css: "text/css",
        js: "application/javascript",
        json: "application/json",
        png: "image/png",
        svg: "image/svg+xml",
        html: "text/html",
      };
      return new Response(body, {
        headers: {
          "content-type": mimeTypes[ext ?? ""] ?? "application/octet-stream",
        },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
});

console.log("Server running at http://localhost:3000");
