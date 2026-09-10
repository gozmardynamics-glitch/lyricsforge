import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleApiRequest } from "./apiRouter";
import { createAuthMiddleware } from "./authGate";

// Port 3005 avoids the Agent OS / BookForge family (Next.js :3000, BookForge
// :3001) so neither the dev server nor this standalone server collides with
// them. Override with PORT env if a different port is wanted.
const PORT = Number(process.env.PORT) || 3005;

// Production mode serves the built UI from ../dist (relative to the bundled
// dist-server/index.cjs). In dev, vite serves the UI + /api itself. This entry
// is never bundled by vite (vite imports ./apiRouter directly), and the esbuild
// bundle emits CJS, so __dirname is the real CJS global.
const DIST_DIR = path.resolve(__dirname, "../dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res: http.ServerResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let pathname: string;
  try {
    pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch {
    sendJson(res, 400, { error: "Bad Request", path: req.url });
    return;
  }
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(DIST_DIR, pathname));
  if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
    sendJson(res, 403, { error: "Forbidden", path: pathname });
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  } catch {
    // SPA fallback: serve index.html for unknown client paths.
    try {
      const index = await readFile(path.join(DIST_DIR, "index.html"));
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(index);
    } catch {
      sendJson(res, 404, { error: "Not Found", path: req.url });
    }
  }
}

const auth = createAuthMiddleware();

const server = http.createServer((req, res) => {
  void routed(req, res);
});

async function routed(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    if (await auth.handle(req, res)) return;
  } catch (err: any) {
    console.error("[Auth] middleware error:", err?.message || err);
    res.statusCode = 500;
    res.end();
    return;
  }
  if (req.url?.startsWith("/api")) {
    handleApiRequest(req, res, () => {
      sendJson(res, 404, { error: "Not Found", path: req.url });
    });
  } else {
    serveStatic(req, res);
  }
}

// Timeout guards: never let a stalled request hold a socket forever.
server.requestTimeout = 60_000; // receiving the full request
server.headersTimeout = 65_000; // receiving headers
server.keepAliveTimeout = 5_000; // idle keep-alive sockets

// Loud, recoverable error handling instead of a raw stack trace.
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[MusicForge] Port ${PORT} is already in use. ` +
      `Stop the other process or set PORT to a different value (e.g. PORT=3015).\n` +
      `Windows caveat: two processes can sometimes silently share :${PORT} — ` +
      `verify with 'netstat -ano | findstr :${PORT}' if the UI looks stale.\n`);
  } else {
    console.error("[MusicForge] Server error:", err.message || err);
  }
  process.exit(1);
});

// Explicit listening confirmation — on Windows two processes can quietly bind
// the same port via SO_REUSEADDR quirks; this makes the winner loud.
server.on("listening", () => {
  const addr = server.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : PORT;
  console.log(`[MusicForge] Listening confirmed on port ${boundPort} (pid ${process.pid}).`);
});

// Graceful shutdown: finish in-flight requests, close listeners, exit cleanly.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[MusicForge] Received ${signal} — shutting down gracefully...`);
  const forceTimer = setTimeout(() => {
    console.error("[MusicForge] Forced exit after 10s.");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();
  server.close((err) => {
    clearTimeout(forceTimer);
    if (err) {
      console.error("[MusicForge] Error during shutdown:", err.message || err);
      process.exit(1);
    }
    console.log("[MusicForge] Server closed. Bye!");
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` AI Lyrics Generator - Multi-Agent Production Server`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` UI:         http://localhost:${PORT}/`);
  console.log(` Health:     http://localhost:${PORT}/api/health`);
  console.log(` OpenAPI:    http://localhost:${PORT}/api/openapi.json`);
  console.log(` Models:     http://localhost:${PORT}/api/models/list`);
  console.log(` Agents:     http://localhost:${PORT}/api/agents/list`);
  console.log(` Serves build from: ${DIST_DIR}`);
  console.log(`======================================================\n`);
});
