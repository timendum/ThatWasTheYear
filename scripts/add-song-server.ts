/// <reference lib="deno.ns" />

/**
 * Minimal Deno server for the browser-based add-song tool.
 *
 * Serves the HTML UI and exposes API endpoints to:
 *   GET  /api/files                   — list available song JSON files
 *   GET  /api/songs?file=songs.json   — read a song JSON file from assets/
 *   POST /api/songs?file=songs.json   — write (overwrite) a song JSON file in assets/
 *   GET  /add-song-shared.js          — bundled shared library for the browser
 *
 * Usage:
 *   deno run -A scripts/add-song-server.ts
 */

import * as esbuild from "esbuild";

const PORT = 3001;
const ASSETS_DIR = "assets";

/** Discover song JSON files in the assets directory. */
function getSongFiles(): string[] {
  const files: string[] = [];
  for (const entry of Deno.readDirSync(ASSETS_DIR)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      files.push(entry.name);
    }
  }
  return files.sort();
}

function getAllowedPath(file: string | null): string | null {
  if (!file || !getSongFiles().includes(file)) return null;
  return `${ASSETS_DIR}/${file}`;
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);

  // Serve the HTML tool
  if (url.pathname === "/" || url.pathname === "/add-song.html") {
    const body = await Deno.readFile("scripts/add-song.html");
    return new Response(body, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Serve bundled TypeScript modules (compiled on-the-fly via esbuild)
  if (url.pathname === "/add-song-shared.js" || url.pathname === "/add-song-ui.js") {
    const entry = "./scripts/lib/" + url.pathname.replace(".js", ".ts");
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: "esm",
      target: "es2023",
      platform: "browser",
    });
    return new Response(result.outputFiles[0].text, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  // GET /api/files — list available song files
  if (url.pathname === "/api/files" && req.method === "GET") {
    const files = getSongFiles();
    return new Response(JSON.stringify(files), {
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/songs?file=songs.json — read song file
  if (url.pathname === "/api/songs" && req.method === "GET") {
    const file = url.searchParams.get("file");
    const path = getAllowedPath(file);
    if (!path) {
      return new Response(JSON.stringify({ error: "Invalid file parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    try {
      const text = await Deno.readTextFile(path);
      return new Response(text, {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch {
      return new Response("[]", {
        headers: { "content-type": "application/json" },
      });
    }
  }

  // POST /api/songs?file=songs.json — save song file
  if (url.pathname === "/api/songs" && req.method === "POST") {
    const file = url.searchParams.get("file");
    const path = getAllowedPath(file);
    if (!path) {
      return new Response(JSON.stringify({ error: "Invalid file parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    try {
      const body = await req.text();
      // Validate it's valid JSON array before writing
      const parsed = JSON.parse(body);
      if (!Array.isArray(parsed)) {
        return new Response(JSON.stringify({ error: "Body must be a JSON array" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      await Deno.writeTextFile(path, body);
      return new Response(JSON.stringify({ ok: true, count: parsed.length }), {
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
});

console.log(`Add-song server running at http://localhost:${PORT}`);
