import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";

/**
 * Optional single-user session auth for the standalone MusicForge/LyricsForge
 * server. Enabled by setting APP_PASSWORD (local dev stays open when absent).
 * Issues a signed random session token in an HttpOnly cookie; every non-public
 * route (SPA assets included) is gated before apiRouter/static serve anything.
 */

const SESSION_COOKIE = "lyricsforge_session";
const SESSION_TTL_MS = (Number(process.env.APP_SESSION_DAYS) || 7) * 24 * 60 * 60 * 1000;
const LOGIN_USER = "lyricsforge";
const MAX_ATTEMPTS_PER_IP = 20;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export function createAuthMiddleware() {
  const password = process.env.APP_PASSWORD || "";
  const enabled = password.length > 0;
  const sessions = new Map<string, number>(); // token -> expiry ms
  const attempts = new Map<string, number[]>(); // ip -> attempt timestamps

  function sweep() {
    const now = Date.now();
    for (const [t, exp] of sessions) if (exp <= now) sessions.delete(t);
  }

  function registerLoginAttempt(ip: string) {
    const list = attempts.get(ip) || [];
    list.push(Date.now());
    attempts.set(ip, list);
  }

  function validSession(token: string | undefined): boolean {
    if (!token) return false;
    const exp = sessions.get(token);
    if (!exp) return false;
    if (exp <= Date.now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  function parseCookies(req: IncomingMessage): Record<string, string> {
    const out: Record<string, string> = {};
    const header = req.headers.cookie;
    if (!header) return out;
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return out;
  }

  function sessionCookie(req: IncomingMessage, token: string, maxAgeSec: number): string {
    const proto = req.headers["x-forwarded-proto"];
    const secure = proto === "https" || (!proto && process.env.APP_COOKIE_SECURE === "1");
    return `${SESSION_COOKIE}=${token || ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
  }

  function safeEqual(a: string, b: string): boolean {
    const ha = crypto.createHash("sha256").update(a).digest();
    const hb = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  }

  function readBody(req: IncomingMessage, limit = 16 * 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => {
        size += c.length;
        if (size > limit) {
          reject(new Error("Body too large"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  function extractPassword(body: string): string {
    try {
      const j = JSON.parse(body);
      if (typeof j?.password === "string") return j.password;
    } catch { /* fall through */ }
    try {
      const p = new URLSearchParams(body);
      const v = p.get("password");
      if (v) return v;
    } catch { /* fall through */ }
    return "";
  }

  function tooManyAttempts(ip: string): boolean {
    const now = Date.now();
    const list = (attempts.get(ip) || []).filter((t) => now - t < ATTEMPT_WINDOW_MS);
    attempts.set(ip, list);
    return list.length >= MAX_ATTEMPTS_PER_IP;
  }

  function loginPageHTML(error: string): string {
    const err = error ? `<p class="err">${error.replace(/[<>&"]/g, "")}</p>` : "";
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>LyricsForge — Sign in</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f19;color:#e5e7eb;font-family:ui-sans-serif,system-ui,sans-serif}
  .card{background:#111827;border:1px solid #1f2937;border-radius:18px;padding:36px 34px;width:min(400px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.55)}
  h1{margin:0 0 4px;font-size:20px;letter-spacing:.4px}
  .sub{color:#5eead4;font-size:12px;margin:0 0 22px}
  label{display:block;font-size:11px;color:#9ca3af;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.08em}
  input{width:100%;box-sizing:border-box;background:#0b1220;border:1px solid #374151;border-radius:10px;padding:11px 12px;color:#fff;font-size:14px;outline:none}
  input:focus{border-color:#2dd4bf}
  button{margin-top:22px;width:100%;background:linear-gradient(90deg,#0d9488,#4f46e5);border:0;border-radius:10px;color:#fff;font-weight:700;padding:11px;font-size:14px;cursor:pointer}
  button:hover{filter:brightness(1.12)}
  .err{color:#f87171;font-size:12px;margin:12px 0 0}
  .mark{font-size:26px;margin-bottom:8px}
</style></head>
<body><form class="card" method="post" action="/login">
  <div class="mark">🎛️</div>
  <h1>LyricsForge Studio</h1>
  <p class="sub">AI Lyrics Generator &amp; Multi-Agent Songwriting Studio</p>
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autofocus autocomplete="current-password" required/>
  ${err}<button type="submit">Enter Studio →</button>
</form></body></html>`;
  }

  function sendHtml(res: ServerResponse, code: number, html: string) {
    res.statusCode = code;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  }

  function clientIp(req: IncomingMessage): string {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
    return req.socket.remoteAddress || "unknown";
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const raw = (req.url || "/").split("?")[0];
    const pathname = decodeURIComponent(raw);
    const method = (req.method || "GET").toUpperCase();

    // Auth endpoints (reachable whether or not auth is enabled)
    if (method === "GET" && (pathname === "/login" || pathname === "/login/")) {
      if (!enabled) { res.writeHead(302, { Location: "/" }); res.end(); return true; }
      sendHtml(res, 200, loginPageHTML(""));
      return true;
    }

    if (method === "POST" && (pathname === "/login" || pathname === "/api/auth/login")) {
      if (!enabled) {
        if (pathname.startsWith("/api")) { res.statusCode = 400; res.end(JSON.stringify({ error: "Server auth is not enabled" })); return true; }
        res.writeHead(302, { Location: "/" }); res.end(); return true;
      }
      const ip = clientIp(req);
      if (tooManyAttempts(ip)) {
        res.statusCode = 429;
        if (pathname.startsWith("/api")) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: "Too many login attempts — try again later." })); return true; }
        sendHtml(res, 429, loginPageHTML("Too many login attempts — wait a few minutes."));
        return true;
      }
      let body = "";
      try { body = await readBody(req); } catch { res.statusCode = 400; res.end(); return true; }
      const pw = extractPassword(body);
      if (pw && safeEqual(pw, password)) {
        attempts.delete(ip);
        sweep();
        const token = crypto.randomBytes(32).toString("hex");
        sessions.set(token, Date.now() + SESSION_TTL_MS);
        if (method === "POST" && !pathname.startsWith("/api")) {
          res.writeHead(302, { Location: "/", "Set-Cookie": sessionCookie(req, token, Math.floor(SESSION_TTL_MS / 1000)) });
          res.end();
        } else {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Set-Cookie", sessionCookie(req, token, Math.floor(SESSION_TTL_MS / 1000)));
          res.end(JSON.stringify({ ok: true, user: LOGIN_USER }));
        }
      } else {
        registerLoginAttempt(ip);
        if (pathname.startsWith("/api")) {
          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid password" }));
        } else {
          sendHtml(res, 401, loginPageHTML("Incorrect password."));
        }
      }
      return true;
    }

    if (method === "POST" && (pathname === "/logout" || pathname === "/api/auth/logout")) {
      const cookies = parseCookies(req);
      const token = cookies[SESSION_COOKIE];
      if (token) sessions.delete(token);
      if (pathname.startsWith("/api")) { res.statusCode = 204; res.end(); return true; }
      res.writeHead(302, { Location: "/login", "Set-Cookie": sessionCookie(req, "", 0) });
      res.end();
      return true;
    }

    if (method === "GET" && pathname === "/api/auth/me") {
      const cookies = parseCookies(req);
      const authed = enabled ? validSession(cookies[SESSION_COOKIE]) : true;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        authEnabled: enabled,
        authenticated: authed,
        user: authed ? LOGIN_USER : null
      }));
      return true;
    }

    // Health/spec endpoints stay public (container healthchecks, docs, monitoring)
    if (pathname === "/api/health" || pathname === "/api/openapi.json" || method === "OPTIONS") {
      return false;
    }

    // Everything else: pass through when disabled or when a session is live.
    if (!enabled) return false;
    const cookies = parseCookies(req);
    if (validSession(cookies[SESSION_COOKIE])) return false;

    if (pathname.startsWith("/api")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("WWW-Authenticate", 'Bearer realm="lyricsforge", or sign in via /login');
      res.end(JSON.stringify({ error: "Unauthorized — sign in at /login" }));
    } else {
      res.writeHead(302, { Location: "/login" });
      res.end();
    }
    return true;
  }

  if (!enabled) {
    console.log("[Auth] APP_PASSWORD not set — server auth disabled (open access, local dev mode).");
  } else {
    console.log(`[Auth] Login protection ACTIVE for user "${LOGIN_USER}" (sessions ${Math.round(SESSION_TTL_MS / 86400000)}d, rate limit ${MAX_ATTEMPTS_PER_IP}/10min).`);
  }

  return { handle, enabled };
}
