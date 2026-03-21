Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(Bun.file("assets/index.html"));
    }

    if (url.pathname === "/index.js") {
      const result = await Bun.build({
        entrypoints: ["./src/index.tsx"],
        target: "browser",
      });
      return new Response(result.outputs[0]);
    }

    if (url.pathname.slice(1).split("/").length === 1) {
      return new Response(Bun.file("assets/" + url.pathname.slice(1)));
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running at http://localhost:3000");
