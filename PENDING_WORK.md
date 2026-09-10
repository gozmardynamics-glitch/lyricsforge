# MusicForge — Pending Work (handoff for next session)

Updated: 2026-09-07 · Companion to `report.md` (full audit) and `PLAN.md` (roadmap).

> ⚠ **FIRST: commit Fix Pass 2 + Fix Pass 3.** The working tree has uncommitted
> changes (PLAN.md, index.html, index.tsx, package.json, pnpm-lock.yaml,
> tsconfig.json, vite.config.ts, src/index.css, src/agents/*, src/server/*,
> src/components/*, src/types.ts, src/constants.ts, src/kbDB.ts, src/aiShim.ts,
> report.md, PENDING_WORK.md, metadata.json, .env.example).
> `git status` is clean of conflicts; run:
> `git add -A && git commit -m "..." && git push origin main`
> before starting new work (only if the user asks you to commit).

---

## Fix Pass 3 — DONE 2026-09-07 (items 1–8 below)

### ✅ 1. Wire agent `allowedTools` into execution — H5
- `orchestratorEngine.ts`: `buildToolInstructionBlock(agent)` injects each agent's
  registered tool definitions into its system prompt (pipeline + writer's room).
- Pipeline stages whose agent has `apply_to_current_song` now **actually execute**
  the tool (`runApplyToolForStage`) and record the call + result in
  `log.toolCalls` — rendered in the modal with a "🔧 tool: … → executed" row.
- Modal badge is honest: shows the real count of tools wired into the selected
  pipeline's stage prompts (was the static "All agent tools active" lie).
- Writer's-room agent replies are also tool-aware via the same prompt block.

### ✅ 2. Forward `customIdeas` into agent prompts — M6
- Pipeline context/outputs now include `customIdeas` (so `{{customIdeas}}` works
  in stage templates); writer's room injects it under a "PRODUCTION NOTES"
  heading. API passes `body.customIdeas` through; OpenAPI documents both.

### ✅ 3. Token auth on all mutating API endpoints
- `isAuthorized(req)` helper in `apiRouter.ts`; applied to every POST endpoint
  (test-connection, generate-lyrics, execute-pipeline, writers-room,
  tools/execute, llm/complete, models/register, generate-artwork).
- OpenAPI: `components.securitySchemes.BearerToken` + per-path `security` + 401
  responses. Verified live: POST without token → 401; with `Authorization: Bearer` → 200.

### ✅ 4. `/api/models/list` sync with the registry — M13
- New `POST /api/models/register` (validated, no secrets accepted, in-memory,
  auth-gated); `GET /api/models/list` returns built-ins + registered models +
  `serverCustomModels` ids. Registered models are resolvable by the server
  dispatcher. OpenAPI documents the endpoint and the in-memory caveat.

### ✅ 5. Split `index.tsx` (~12.9k → ~1.8k lines)
- `src/types.ts` (Song/Album/LANGUAGES/AppSettings/ExtendedStyleTemplate/LS keys),
  `src/constants.ts` (occasions/genres/moods/presets), `src/kbDB.ts` (IndexedDB),
  `src/aiShim.ts` (`callUniversalAI`/`ai`), `src/components/shared.tsx`
  (Tooltip/CopyButton/Spinner/parseLyricsMarkdown/syllable counters),
  `src/components/generateLyricsPdf.ts`, `src/components/exportUtils.ts`.
- 20+ components extracted to `src/components/` and lazy-loaded with Suspense:
  artwork, lyric sheet export, enhancer, genre analyzer, collab room, chord
  progression, sentiment overlay, metronome, TTS, version history sidebar,
  thematic hooks, melody guidance, theme generator, production library, style
  templates, settings, album songs, autonomous virality studio, lyrics companion,
  compare drafts, D3 radar, API modal, LyricsDisplay.
- **Build warning gone**: main chunk 665 KB → 326 KB; 20+ code-split chunks.
  `tsc --noEmit` clean after every step.

### ✅ 6. Real artwork image generation (server) + honest labeling
- New `POST /api/generate-artwork`: server-side Gemini image generation
  (env `GEMINI_IMAGE_MODEL`, default `gemini-2.5-flash-image`), returns base64
  `imageData`; 502 with reason + `fallback: "procedural-canvas"` when unavailable.
- Artwork modal now calls this endpoint; when the image model is unavailable it
  falls back to the procedural canvas and shows an explicit badge:
  "AI image (server)" vs "Procedural canvas — no AI image". The dead text-only
  `ai.models.generateContent` image attempt (which could never return
  `inlineData`) is removed. `metadata.json` updated.

### ✅ 7. Honest trend tool
- `search_web_music_trends` renamed to `simulate_music_trends`
  ("Music Trend Synthesis (No Live Web)"). Legacy id still accepted in the
  tool API and migrated in stored agents (`normalizeStoredAgents`). Tool/system
  prompts, Clio's profile, the pipeline stage, and the OpenAPI description now
  all state it is knowledge-based synthesis — never live web data. Output opens
  with an explicit "NOT live web" disclaimer line.

### ✅ 8. Minor polish
- "Hermes Agent Studio" button relabeled to "Agentic Studio".
- `.env.example`: added `OPENROUTER_SITE_URL`/`OPENROUTER_SITE_NAME` and
  `GEMINI_IMAGE_MODEL`.
- `src/server/index.ts`: `server.on("listening")` logs the confirmed port + pid;
  EADDRINUSE message includes the Windows double-bind caveat + netstat hint.
- `metadata.json`: capability claims updated (server-side LLM proxy + artwork
  endpoint are real now).
- Bonus fixes found along the way: writer's-room "Apply as Lyrics"/"Add to Song
  Notes" buttons no longer show false success when there is no active song
  workspace (callback now returns success); pipeline "Apply Results" reports
  failure when nothing was applied.

## Verification (all green)
```
pnpm run typecheck     # strict mode, 0 errors
pnpm run build         # NO >500kB chunk warning (main chunk 326 KB)
pnpm run build:server  # esbuild OK (1.6 MB dist-server/index.cjs)
# Live probes (standalone server):
#   GET  /api/health            -> 200
#   GET  /api/openapi.json      -> 200 (11 paths, BearerToken scheme)
#   GET  /api/models/list       -> 200 (15 built-ins + serverCustomModels)
#   POST /api/generate-artwork  -> 502 with reason when no GEMINI_API_KEY
#   POST w/o token (API_ACCESS_TOKEN set) -> 401; with Bearer token -> 200
#   POST /api/models/register with token -> registered + visible in /models/list
```

## Remaining (nice-to-haves, none blocking)
- `/api/models/register` is in-memory only — persists for the server's lifetime.
  A file/env-backed store would survive restarts.
- `SongConfigurationCard`, `AlbumCreationStep`, `SongConfigurationStep`,
  `FinalizedAlbumView` and `App` remain in index.tsx (~1.8k lines) — could be
  split further but the chunk warning is already gone.
- The writers-room "apply_to_current_song" tool execution is pipeline-only;
  writer's-room replies still rely on the manual Apply buttons (by design).
