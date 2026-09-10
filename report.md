# MusicForge — Code Review Report

**Project:** AI Lyrics Generator & Multi-Agent Songwriting Studio
**Reviewed:** 2026-09-06 · Repo @ commit `ae9cf56`
**Verification performed:** `tsc --noEmit` (clean), `vite build` (OK, 1.4 MB chunk warning), `esbuild` server bundle (OK), live API probing of `dev` and standalone server, full read of `src/agents/*`, `src/server/*`, `src/components/AgentOrchestratorStudioModal.tsx`, full read of `index.tsx` (~13k lines).

> ## 🔧 Fix Pass 1 — Applied 2026-09-06 (see §7 checklist for per-item status)
> **Fixed & verified (21 items):** C1 connection tester honesty · C2 fallback flagging + 502s · C3 lyrics double-wrap & modal re-seed · C5 input validation/body cap · C4 server-side key proxy (`/api/llm/complete`) + no keys in client bundle · C6 XSS escape · H1 pipeline-ID contract · H2 per-call timeouts/abort · H3 cancellable pipelines + Stop button · H4 launcher path · H6 Node-safe storage · H7 bulk-approve data loss · M1 unresolved placeholders · M2 built-in agent edit · M3 stale agent select · M4 stage-strip alignment · M5 cloned progress · M7 duplicate prompt turn · M15 occasion mismatch · M17 `contents.parts` unwrap · M18 import normalization · M19 companion success flag · plus P4 hygiene (unused imports, dead code, ID collisions, blob leak, array aliases, `??` scores, speech cleanup, `autoCriticLoop` gating, `.env.example`, lockfile, doc fixes).
>
> ## 🔧 Fix Pass 2 — Applied 2026-09-07
> **Fixed & verified:** M10 server lifecycle (error handler with readable EADDRINUSE message, SIGINT/SIGTERM graceful shutdown, request/headers/keep-alive timeouts) · OpenAPI 400/502 responses synced for generate-lyrics / test-connection / writers-room · M12 Anthropic JSON forcing (prompt-level + schema embed; stop_sequences honored) · writers-room message cap (last 100) · OpenRouter referer/site-name configurable via `OPENROUTER_SITE_URL`/`OPENROUTER_SITE_NAME` · PLAN.md filled · L6 replay timer cleared on unmount · L12 rhyme fetch debounced (500 ms + unmount cleanup) · L14 chord-sheet parity counter fixed · L3 `Song.musicKey` added and wired through `onApplySongUpdate` · L4 recent-styles history now persisted (dropdown records + reorders, manual styles recorded on generation) · L2 dead `HermesAgentStudioModal` removed (307 lines) · M16 BroadcastChannel snapshots now read live refs; channel no longer recreated per username keystroke · M8 Tailwind CDN replaced with build-time Tailwind v4 (14 KB gzip CSS) · M9 vendor chunks split (main bundle 1.41 MB → 665 KB) · tsconfig `strict: true` enabled with `@types/react` (+ 1 real strict error fixed).
> **Still open (tracked in §7):** H5 dead tool/registry UI wiring · M6 `customIdeas` forwarding into prompts · M13 static `/api/models/list` (documented by design) · API_ACCESS_TOKEN on all mutating endpoints · split `index.tsx` into view modules (residual 500 kB chunk warning).

> ## 🔧 Fix Pass 4 — Applied 2026-09-10 (multi-provider LLM registry + login)
> Expanded registry (Claude Sonnet 4/Opus 4.1, GPT-5, Meta Llama 4 via OpenRouter/Groq/Ollama, extra local Ollama models); the Studio "Model Registry" tab became a full manager (test/set-default/add-custom/provider keys); agent forms gained per-agent Preferred-LLM selects (temp+tokens too); APP_PASSWORD session-auth gate shipped for deployments (login page, HttpOnly cookie, rate limit) and enabled on the live VPS instance; Ctrl/Cmd+S saves a version snapshot; `.env.example` + OpenAPI updated.
>
> ## 🔧 Fix Pass 3 — Applied 2026-09-07 (resolves the remaining open items)
> **Fixed & verified:** H5 agent `allowedTools` wired into execution (tool definitions injected into stage/writer's-room prompts; `apply_to_current_song` executes for real and is recorded in `log.toolCalls`, rendered in the modal; the static "All agent tools active" lie replaced with a live tool count) · M6 `customIdeas` forwarded into pipeline context/outputs (`{{customIdeas}}` templating) and writer's-room "PRODUCTION NOTES" (API + OpenAPI too) · token auth on ALL mutating endpoints via `isAuthorized()` + OpenAPI `securitySchemes.BearerToken` (verified 401/200 live) · M13 `/api/models/list` now synced via `POST /api/models/register` (in-memory, no secrets) — registered models resolvable by the dispatcher · `index.tsx` split (~12.9k → ~1.8k lines): types/constants/kbDB/aiShim/shared/pdf/export-utils modules + 20+ code-split lazy components — **the >500 kB chunk warning is gone (665 KB → 326 KB main chunk)** · artwork: new `POST /api/generate-artwork` (server-side Gemini image model, `GEMINI_IMAGE_MODEL` env) + honest source badges; dead text-only image call removed; `metadata.json` updated · trend tool honestly renamed `simulate_music_trends` ("no live web") with legacy-id migration, explicit output disclaimer, and updated Clio/pipeline/OpenAPI copy · minor polish: "Agentic Studio" button label, `.env.example` OpenRouter/Gemini-image vars, `server.on("listening")` + Windows double-bind guidance · false-success alerts in writer's-room apply buttons fixed (callback returns success).
> **Verification (2026-09-07, pass 3):** `tsc --noEmit` (strict) 0 errors · `vite build` with no chunk-size warning (main 326 KB, 20+ split chunks) · esbuild server bundle OK · live probes: health/openapi/models/UI 200, artwork 502-with-reason when keyless, 401/200 token gating, register→list sync all confirmed on the standalone server.

---

## 1. Concept Understanding

MusicForge is a **client-heavy React SPA (single 12.9k-line `index.tsx`)** plus a **thin Node/Vite-middleware REST API** that provides:

```
┌─────────────────────────────── index.tsx (SPA) ───────────────────────────────┐
│  Quick Theme Generator · Virality Studio · Album Studio · Library/D3 charts  │
│  AgentOrchestratorStudioModal (pipelines + writer's room + agent builder)    │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │ localStorage: models, provider keys, agents, drafts
               ▼
   src/agents/llmRegistry.ts ── executeUniversalLLMCall() ──► Gemini / Claude /
               │                       (direct browser fetch)  OpenAI / DeepSeek /
               │                                               Groq / OpenRouter / Ollama
               │                ┌─► on ANY failure: generateProceduralFallback()
               ▼                │    (canned "Neon Shadows" lyrics) — never throws
   orchestratorEngine.ts ───────┘
   • runOrchestratorPipeline(): sequential stages, {{var}} templating, onProgress
   • sendWritersRoomMessage(): single-turn agent chat with last-8 history
   • agentTools.ts: 8 "tools" (all are just LLM prompt wrappers)
               ▼
   src/server/apiRouter.ts ── mounted in Vite dev/preview middleware (vite.config.ts)
   src/server/index.ts ────── standalone Node server (esbuild → dist-server/index.cjs,
                               serves dist/ + /api) — port 3005
```

**Pipeline workflow** (`full_hitmaker_pipeline`): Clio trends → Hermes lyrics → Harmonia chords → Calliope melody → Quincy A&R → Iris visuals. Each stage's output is injected into later prompts via `{{outputKey}}`.

The architecture is sound in shape; the defects below are mostly about **silent failure modes**, **termination handling**, and **contract mismatches**.

---

## 2. Critical Bugs

### C1. Connection tester can never report failure — always "connected"
**Where:** `src/agents/llmRegistry.ts:369-399` (+ `:486-670`)
`executeUniversalLLMCall()` catches **every** provider error and falls back to `generateProceduralFallback()` — it **never rejects**. Therefore `testModelConnection()` treats any resolve as a success. Verified live:

```
POST /api/models/test-connection {"modelId":"totally_bogus_model"}
→ {"modelId":"gemini_2_5_flash","status":"connected","latencyMs":3}   ← fake
```

Two bugs in one: (a) unknown `modelId` silently substitutes `models[0]`; (b) a wrong/missing API key reports **connected** in 3 ms (no network call could be that fast). The Settings "Test Connection" feature is meaningless and actively misleading.

**Fix:** Make `executeUniversalLLMCall` throw on provider failure (or return `{ok, text, usedFallback, error}`). In `testModelConnection`, only report `connected` when the provider responded and the resolved model id equals the requested one; report `error` + message otherwise. Reject unknown model ids with a clear error instead of `models[0]`.

### C2. Canned fallback lyrics masquerade as real generation (fake success)
**Where:** `src/agents/llmRegistry.ts:667-669`, `src/agents/orchestratorEngine.ts:226-231`, `src/server/apiRouter.ts`
Because the dispatcher never throws, the pipeline's `catch`/`status:"error"` branch is **unreachable**, and every stage "completes". Verified live — all 6 stages of the pipeline returned the identical canned `Neon shadows across the midnight floor…` text and the API reported `status:"completed"`. Users pay for / trust "generated" songs that were never generated.

**Fix:** Propagate a `usedFallback: true` flag through `PipelineExecutionLog` and API responses; render a visible "⚠ Procedural fallback (no LLM configured)" badge in the UI; fail `/api/generate-lyrics` and pipeline stages with HTTP 502 when no provider is actually reachable (or make fallback opt-in).

### C3. Applying pipeline results corrupts song data (double-wrapped lyrics + phantom rename)
**Where:** `index.tsx:13326-13327` ↔ `src/components/AgentOrchestratorStudioModal.tsx:45-49, 116, 151-157`
Two stacked bugs:
1. Caller wraps lyrics **twice**: `lyrics: [[update.lyricsText.split('\n')]]` while `Song.lyrics` is `string[][]` (one wrap). Downstream `version.join('\n')` (`index.tsx:4190`) stringifies the inner array → lyrics collapse into one comma-joined line, which then also garbles `{{existingLyrics}}` fed to the "A&R Song Doctor" pipeline.
2. The modal seeds `pipelineTitle/Genre/Mood/Key` from `activeSongContext` **once at mount** (modal is permanently mounted with `album = null`), so they freeze to defaults `"Neon Symphony"/"Synthwave Pop"/"D Minor"`. `handleApplyPipelineOutputs` then sends those defaults and the caller **silently renames and overwrites the user's song**.

**Fix:** `lyrics: [update.lyricsText.split('\n')]` (single wrap); re-seed the modal's brief fields in the existing open-effect (`useEffect` on `isOpen`) from `activeSongContext`.

### C4. API keys are exposed to the browser bundle and third-party providers from the client
**Where:** `vite.config.ts:42-50` (`define` bakes `process.env.*` into the JS bundle), `src/agents/llmRegistry.ts:553-560` (`anthropic-dangerous-direct-browser-access: true`), localStorage `lyricist_pro_provider_api_keys_v2`
Any visitor of a deployed site can read all provider keys from the shipped JS or DevTools. The docs call this "secure client-side storage" — it is not.

**Fix:** Move provider calls server-side behind `/api/*` (the router already exists — proxy `executeUniversalLLMCall` from the client instead of calling providers directly); serve keys only from Node env (`--env-file=.env.local`); never ship keys via Vite `define`.

### C5. API contract: malformed input accepted, no validation, no limits, open CORS
**Where:** `src/server/apiRouter.ts:8-33, 107-215`
Verified live: posting the literal body `not-json` to `/api/generate-lyrics` returned **HTTP 200** with fallback lyrics (JSON-parse failure resolves `{raw: body}` and every field falls back to defaults). No body-size limit (DoS via huge POST), no schema validation, `Access-Control-Allow-Origin: *` on all responses, no auth — while docs advertise a "production REST API".

**Fix:** Return 400 on unparseable JSON; cap body size (e.g. 1 MB) and reject beyond it; validate required fields (`theme`, `pipelineId`, `toolId`); make CORS configurable and default to the app origin; add optional bearer-token auth for non-localhost.

### C6. XSS: unescaped LLM/user/collab content injected via `dangerouslySetInnerHTML`
**Where:** `index.tsx:548-551, 559` (`parseLyricsMarkdown` → `<p dangerouslySetInnerHTML={{ __html: formattedLine }}>`)
Lyric lines come from AI output, pasted user text, BroadcastChannel collaborators, and imported JSON. None of it is HTML-escaped before regex-wrapping and injection, so a lyric line like `<img src=x onerror=alert(1)>` executes script in the app. This is the main render path for every generated/pasted lyric.

**Fix:** HTML-escape the raw line (`& < > "`) **before** the decorative regex wrapping (which only injects known-safe spans), or rebuild the decoration as React elements instead of `innerHTML`.

---

## 3. High-Severity Bugs

### H1. Broken pipeline ID in server default + OpenAPI docs
**Where:** `src/server/apiRouter.ts:157`, `src/server/openapiSpec.ts:209`
Default/example `pipelineId` is `"hitmaker_master_suite"` — **no such pipeline exists** (`full_hitmaker_pipeline`, `quick_hook_harmony`, `ar_song_doctor` are the real IDs). `find(...) || PRECONFIGURED_PIPELINES[0]` silently runs a *different* pipeline than requested. Verified live: `nonexistent_pipeline` → ran `full_hitmaker_pipeline` with `status:"completed"`. Docs-followers get silently different behavior.

**Fix:** Change default/example to `full_hitmaker_pipeline`; return 400 with the valid-ID list for unknown IDs (see C5).

### H2. No timeout or abort on OpenAI-compatible fetches (hangs forever)
**Where:** `src/agents/llmRegistry.ts:645-649`
Gemini gets a 4-second race timeout (far too aggressive for 2048-token generations — long lyrics will spuriously "fail" into fallback), but **every other provider has no timeout at all**: a stalled socket hangs the stage/pipeline/request indefinitely. No `AbortController` is used anywhere.

**Fix:** One `AbortController` per call with a configurable timeout (30–120 s), wired into `fetch(..., {signal})`; race timeout for Gemini raised to match.

### H3. Pipelines cannot be cancelled; UI can get stuck "running"
**Where:** `src/agents/orchestratorEngine.ts:189-233`, `src/components/AgentOrchestratorStudioModal.tsx:102-135, 291-296`
The stage loop has no `AbortSignal`; the modal has no Stop button; the header `×` closes the modal while the loop keeps burning paid LLM calls. `handleRunPipeline` awaits `runOrchestratorPipeline` **without try/finally**, so any unexpected rejection leaves `isPipelineRunning` stuck `true` (Run button disabled forever).

**Fix:** Thread an `AbortSignal` through the engine (check between stages + pass to fetch); add a Stop button; wrap the run in `try { … } finally { setIsPipelineRunning(false); }`.

### H4. Desktop launcher points to a hardcoded path that doesn't exist
**Where:** `scripts/MusicForge-Launcher.bat:23`
`set "MFORGE=C:\Users\user\ai-lyrics-generator"` — the project actually lives at `...\Desktop\musicforge-0609\musicforge`. Every menu action fails with "project not found". The comment even says "FIXED PATHS: if the project moves, edit MFORGE".

**Fix:** Derive the path from the script location: `set "MFORGE=%~dp0.."` (one line), removing the hardcoded path entirely.

### H5. Agent "tools" are dead decoration; Model-registry tab is dead UI
**Where:** `src/components/AgentOrchestratorStudioModal.tsx:4, 6, 880-899, 952-996`; `src/agents/orchestratorEngine.ts:203-209, 278-284`
`executeAgentTool` is imported but **never called**; neither the pipeline engine nor the writer's room ever executes `agent.allowedTools`, yet the builder shows tool checkboxes and an "All agent tools active" badge. The "LLM Model Registry" tab renders static cards: `DEFAULT_LLM_MODELS`, `saveLLMModels`, `getProviderApiKeys`, `saveProviderApiKeys`, `testModelConnection` are all imported and unused — no add/edit/test/key entry is wired. Also, tool `search_web_music_trends` performs **no web search** — it's an LLM prompt pretending to research trends (hallucinated "real-time" data).

**Fix:** Either wire tool dispatch + registry editing/key forms, or remove the dead controls and rename `search_web_music_trends` honestly (e.g. `simulate_music_trends`).

### H6. Server-side code reads browser `localStorage` — works only by accident
**Where:** `src/agents/llmRegistry.ts:248, 279, 298`; `src/agents/orchestratorEngine.ts:9` (called from `apiRouter.ts`)
In the standalone Node server, `getStoredLLMModels()/getStoredAgents()/getProviderApiKeys()` hit a `ReferenceError: localStorage is not defined`, silently swallowed by broad `catch` blocks. Consequence: the server always uses default models/agents and **cannot see configured keys or custom agents**, and any real storage error is also masked.

**Fix:** Detect the environment (`typeof localStorage === "undefined"`) and use an in-memory/env-backed store for Node; narrow the catches to `QuotaExceededError`/`SyntaxError`.

### H7. "Bulk Approve" silently loses all but the last update (stale-state overwrite)
**Where:** `index.tsx:10121-10129` (`handleBulkApprove`) + root cause `index.tsx:12748-12754` (`handleUpdateSong`)
The batch loops `onUpdateSong(s.id, …)` per track, but `handleUpdateSong` computes from the render-time `album` closure — every call starts from the same base, so only the final `setAlbum` survives and all but the last selected track are never approved.

**Fix:** Apply the batch as one update (`handleUpdateAlbum({ songs: album.songs.map(s => selectedTrackIds.includes(s.id) ? {...s, isApproved:true} : s) })`), or derive `handleUpdateSong` from `setAlbum(prev => …)`.

---

## 4. Medium-Severity Issues

| # | Issue | Where | Notes / Fix |
|---|-------|-------|-------------|
| M1 | Unresolved `{{placeholders}}` silently left in prompts | `orchestratorEngine.ts:197-200` | If a `dependsOn` stage is disabled, its `{{outputKey}}` stays literal in the prompt. Strip unresolved `{{…}}` tokens or fail the stage with a clear message. |
| M2 | Editing a built-in agent destroys its identity | `AgentOrchestratorStudioModal.tsx:220-244` | Update path hardcodes `isBuiltIn:false` + teal theme, losing the original `colorTheme`/badge and enabling Delete on built-ins. Use `{ ...selectedAgentForEdit, ...formFields }`. |
| M3 | Target-agent select can desync from actual receiver | `AgentOrchestratorStudioModal.tsx:56, 568-577` | Stale `selectedTargetAgentId` + engine fallback `find(...) \|\| agents[0]` → reply attributed to the wrong agent. Reset selection on agent-list change. |
| M4 | Stage strip misaligned when stages are disabled | `AgentOrchestratorStudioModal.tsx:439-442, 480` vs `orchestratorEngine.ts:169` | UI renders all stages; engine runs `.filter(isEnabled)` — indexes diverge. Render the same filtered list; display `currentStageIndex + 1`. |
| M5 | Shared mutable result state | `AgentOrchestratorStudioModal.tsx:129`, `orchestratorEngine.ts:224` | `setPipelineResult({...updated})` shares `logs` arrays the engine keeps mutating → React state mutated by reference. Deep-clone in progress payloads. |
| M6 | `customIdeas` and song id never used by agents | `AgentOrchestratorStudioModal.tsx:119-127, 187-193` | Caller passes them; neither pipeline context nor writer's-room `songContext` includes them. Pass through to prompts. |
| M7 | Duplicated user turn in writer's-room prompt | modal `:183-186` + engine `:259, 276` | Just-added user message appears both in history and as `USER PROMPT / TASK`. Send `history.slice(0, -1)`. |
| M8 | Tailwind via CDN script in production | `index.html:7` | `cdn.tailwindcss.com` is a dev-only JIT compiler: blocked offline, breaks CSP, flash-of-unstyled. Install Tailwind as a build dependency; replace `!important` light-theme overrides with CSS variables. |
| M9 | 1.4 MB JS bundle, no code splitting | `index.tsx:1-6` (full `import * as d3`), build warning | `pnpm build` emits a >500 kB warning (contradicts WORK_BREAKDOWN "zero compile warnings"). Lazy-import `d3` (Library view) and `jspdf` (export) via `import()`; add `manualChunks`. |
| M10 | Server lifecycle: no `error` handler, no graceful shutdown | `src/server/index.ts:78-99` | No `server.on('error')` (EADDRINUSE prints a raw stack), no SIGINT/SIGTERM handler, no keep-alive timeouts. Add error logging + graceful close, and (Windows caveat observed) verify port conflicts loudly. |
| M11 | Broad silent catches everywhere | `llmRegistry.ts:543-545, 589-591, 661-663`; `apiRouter.ts:16-20` | Failures only reach `console.warn` — invisible in the UI. Surface a `degraded` state instead of swallowing. |
| M12 | `responseFormat`/`stopSequences` ignored by Anthropic path | `llmRegistry.ts:562-577` | `responseFormat:'json'` and `stopSequences` are honored for Gemini/OpenAI-compatible only; JSON-mode via Claude silently degrades to free text (then "fixed" by `safeExtractJSON` luck). Map to Anthropic `stop_sequences` and append JSON instruction. |
| M13 | `/api/models/list` ignores user-configured registry | `apiRouter.ts:84-88` | Server returns `DEFAULT_LLM_MODELS` while the browser uses localStorage-merged registry → API docs list ≠ app behavior. Add `GET /api/agents/list` equivalent sync or document as static catalog. |
| M14 | Docs: false "strict TypeScript" claim | `WORK_BREAKDOWN.md:74`, `tsconfig.json` | `tsconfig.json` has **no `"strict": true`** (and no `strictNullChecks`). Enable strict mode or fix the claim. Also WORK_BREAKDOWN says API mounted at `:3000` while it's `:3005`. |
| M15 | `"Custom"` vs `"Custom Occasion"` mismatch — custom-occasion input unreachable | `index.tsx:287` (option), `10782`, `11416` | Comparisons test `occasion === "Custom"` but the select's option is `"Custom Occasion"`, so the custom input can never appear, `customOccasion` is dead state, and the literal string is sent to the AI. Compare against `"Custom Occasion"` in both places. |
| M16 | BroadcastChannel: stale `lyricsText`/`songTitle` snapshot + channel churn per keystroke | `index.tsx:2042-2090`, `2221` | The `onmessage` handler closes over creation-time `lyricsText`/`songTitle` (joiners get outdated lyrics), and the effect deps include `userName`, so every alias keystroke tears down/recreates the channel (snapshot storms). Keep the values in refs; exclude `userName` from the effect (sync via rename message) or debounce. |
| M17 | `callUniversalAI` never unwraps `contents.parts`, ignores `model` — artwork pipeline can never work | `index.tsx:18-27`, calls at `4967-4999` | The artwork modal passes `contents: {parts:[{text}]}` and an image model string; the prompt is JSON-stringified as a literal `{"parts":…}` payload and the model is dropped — every request degrades to the canvas fallback with a garbage prompt. Unwrap `parts` text and forward `model`. |
| M18 | Library view crashes on imported JSON: unguarded `.toLowerCase()` | `index.tsx:8910, 8917-8924` vs importer `8787-8807` | Import accepts arbitrary JSON with no validation; a song missing `mood`/`title`/`genre` throws a TypeError during render and crashes the view. Use `(s.mood \|\| '')` guards or normalize on import. |
| M19 | `LyricsCompanionAgent` always reports success even when refinement failed | `index.tsx:12435-12437` (handler swallows errors `11229-11338`) | The floating companion unconditionally posts "Applied changes…", so failures are invisible. Return a success flag from `onRefine` and render the failure. |

---

## 5. Low-Severity Issues

- **Empty `PLAN.md`** (0 bytes) — either delete or fill it.
- **Dual lockfiles** `bun.lock` + `pnpm-lock.yaml` committed — pick one package manager (scripts assume pnpm); delete the other to avoid divergent installs.
- **`.env.example` incomplete** — only `GEMINI_API_KEY=` while `vite.config.ts` reads `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (+alias `CLAUDE_API_KEY`), `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, and `package.json` uses `.env.local`. List all.
- **`metadata.json`** claims `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` but calls are client-side — update or implement server-side.
- **Unbounded chat state + `Date.now()` IDs** (`AgentOrchestratorStudioModal.tsx:196`, `orchestratorEngine.ts:215, 287`) — cap history and use an incrementing counter for IDs.
- **False-success alerts** — clipboard `writeText` is fire-and-forget yet "copied!" alert shows (`:1019-1023`); apply-success alert shows even when `onApplySongUpdate` is undefined (`:159`).
- **Hardcoded OpenRouter headers** `HTTP-Referer: https://ai-lyrics-generator.studio` (`llmRegistry.ts:624`) — a URL that likely isn't yours; should be configurable.
- **`supportedProviders` in `/api/health` omits** `nous_hermes`, `openai_compatible`, `anthropic_compatible` which the registry supports.
- **12,897-line single component** (`index.tsx`) — unmaintainable; split by view into `src/components/*` (the modal already proves the pattern works).
- **Keys shorter than 8 chars treated as dummy** (`llmRegistry.ts:507`) — heuristic can reject valid short tokens for custom gateways; make explicit instead.
- **Unused imports / dead code** — `GoogleGenAI`, `Type`, `DEFAULT_LLM_MODELS`, `safeExtractJSON` imported in `index.tsx:3,13-14` but unused; dead `addLog` (`10785`), `canvasRef` (`4830`); `HermesAgentStudioModal` (`7055-7358`, ~300 lines) never rendered while the "Hermes Agent Studio" button opens a different modal.
- **`Song.musicKey` doesn't exist** — `index.tsx:13318` reads `album?.songs?.[0]?.musicKey \|\| "C Major"`; field never set, agents always get "C Major".
- **`recent_styles_history_v1` never written** — `RecentStylesDropdown` (`8252, 8268-8275`) reads a key no code writes; history is permanently the 6 defaults. Persist selections or drop the pretense.
- **`speechSynthesis.onvoiceschanged` not cleared on unmount; replay timer can speak after close** (`index.tsx:3481-3488, 3580-3585`).
- **Artwork auto-generate effect missing deps** (`index.tsx:5011-5015`).
- **Stale `copiedIdx` + index keys in `LyricEnhancerModal`** (`index.tsx:626, 891, 918`) — "Copied!" shows on the wrong suggestion after regeneration.
- **Aliased version arrays on revert** (`index.tsx:12817`) — `[linesArray, linesArray, linesArray]`; clone each.
- **`||` swallows valid 0 virality scores** (`index.tsx:10653, 11917, 11309`) — use `??`.
- **Blob URL leak in collab draft download** (`index.tsx:2362-2369`) — missing `URL.revokeObjectURL` (other exports do revoke).
- **Rhyme fetch fires per keystroke** (`index.tsx:2269-2271` + `1919-1943`) — `onKeyUp`+`onClick`+`onSelect` all trigger LLM calls with no debounce.
- **`Date.now()`-only IDs collide** (`index.tsx:7515, 10649, 10185, 10696`) — duplicate React keys; append a random suffix.
- **Chord-sheet parity counts headers/blanks** (`index.tsx:1001-1008`) — chord placement drifts; count only lyric lines.
- **`autoCriticLoop` checkbox has no functional effect** (`index.tsx:11612-11623` vs `11201`) — gate the critic stages on the flag or remove the toggle.

**Verified non-defects in `index.tsx`:** `localhost:3005` URLs match server/README/launcher; the `AgentOrchestratorStudioModal` prop contract matches; all `setInterval`/`setTimeout` in effects have cleanup; `parseInt` uses radix 10; generation flows reset loading flags in `finally`; no `eval`; no hardcoded keys in this file.

---

## 6. What Was Checked and Is Fine

- `tsc --noEmit` — **0 errors**; `vite build` and `esbuild server bundle` succeed.
- Standalone server: serves `dist/` UI (HTTP 200), `/api/health` OK, **path-traversal attempt → 403** (`index.ts` normalization guard works).
- All pipeline stage `agentId`s and all 8 tool IDs referenced by the UI exist in `DEFAULT_AGENTS` / `AVAILABLE_AGENT_TOOLS`; localStorage key `lyricist_pro_agents_registry_v1` matches between modal and engine.
- Unknown `/api/*` route → JSON 404 (correct); CORS preflight `OPTIONS` → 204.

---

## 7. Checklist & Solutions

> **Live checklist — updated as fixes land.** ☐ open · ✅ fixed & verified (typecheck + build + live API probes, 2026-09-06)

### P0 — Correctness & trust (fix first)
- [x] ✅ **C1 Test-connection never fails** → dispatcher split into `runUniversalLLMCall` (throws on provider failure), `executeUniversalLLMCallStrict`, and `executeUniversalLLMCallDetailed` (`{text, usedFallback, error}`); `testModelConnection` reports `connected` only on a real provider reply; unknown `modelId` → `status:"error"` with the list of valid ids. *Verified: bogus model → `error` + valid-id list; valid model w/o keys → `error "No valid Google Gemini API key configured"`.*
- [x] ✅ **C2 Fallback masquerades as success** → pipeline/writer's-room logs are prefixed `[PROCEDURAL FALLBACK — provider unavailable: <reason>]`; the legacy UI dispatcher prefixes the same marker; `/api/generate-lyrics` and `/api/llm/complete` return **502** instead of fake lyrics; pipeline returns **502** when it errors out. *Verified live on dev + standalone server.*
- [x] ✅ **C3 Apply corruption** → `index.tsx` single-wraps lyrics (`[update.lyricsText.split('\n')]`); the modal re-seeds pipeline title/genre/mood/key from `activeSongContext` every time it opens. *Typecheck-verified.*
- [x] ✅ **C6 XSS in lyric renderer** → raw line is HTML-escaped (`& < > "`) before decorative wrapping in `parseLyricsMarkdown`. *Typecheck-verified.*
- [x] ✅ **H1 Wrong pipeline ID in API/docs** → default & OpenAPI example now `full_hitmaker_pipeline` with enum; unknown ID → **400** + `validPipelineIds`. *Verified live.*
- [x] ✅ **H7 Bulk Approve loses updates** → single `onUpdateAlbum` batch update; `handleUpdateSong` in App now derives from `setAlbum(prev => …)` (stale-closure root cause fixed for all callers). *Typecheck-verified.*
- [x] ✅ **C5 Input validation** → malformed JSON → **400**; 1 MB body cap (over → connection destroyed); required-field checks on `modelId`, `theme/genre/mood`, `userMessage`, `toolId`, `userPrompt`; CORS origin configurable via `CORS_ALLOW_ORIGIN`. *Verified: `not-json` → 400, `{}` → 400, oversized → killed.*

### P1 — Security
- [x] ✅ **C4 Key exposure** → provider keys removed from the client bundle (`vite` `define` block deleted); new `POST /api/llm/complete` proxy runs calls server-side with Node env keys; browser dispatcher prefers the proxy and only falls back to direct calls (user-entered localStorage keys) when no server is present; `anthropic-dangerous-direct-browser-access` header removed; optional `API_ACCESS_TOKEN` gates the proxy. *Verified: secret scan of `dist/assets/*.js` finds no key values (only SDK env-var names and runtime readers).*
- [x] ✅ **Token auth on all mutating endpoints** → `isAuthorized()` helper applied to every POST handler; OpenAPI documents `BearerToken` security scheme + per-path `security` + 401s. *Verified live: 401 without token, 200 with `Authorization: Bearer <token>`.*

### P2 — Termination & robustness
- [x] ✅ **H2 Timeouts/abort** → single `AbortController` per LLM call with `timeoutMs` (default 60 s, configurable per call) wired into every provider branch + external `AbortSignal` pass-through. *Verified: calls with no provider fail fast with a clear message instead of hanging.*
- [x] ✅ **H3 Cancellable pipelines** → `runOrchestratorPipeline` accepts `signal`, checks it between stages and aborts in-flight calls; modal has a **⏹ Stop** button, creates an `AbortController` per run, wraps the run in `try/catch/finally` (Run button can no longer get stuck), and closing the modal aborts in-flight work. *Typecheck-verified.*
- [x] ✅ **H6 Node localStorage** → environment-aware `safeStorageGet/Set` in `llmRegistry` + `hasLocalStorage` guard in `orchestratorEngine`; `getProviderApiKeys` reads real `process.env` in Node (incl. `CLAUDE_API_KEY` alias) and falls back to stored keys only when they have content. *Verified: standalone server runs clean — health/pipeline/test-connection all work, no ReferenceError.*
- [x] ✅ **M10 Server lifecycle** → `server.on("error")` with readable EADDRINUSE guidance, SIGINT/SIGTERM graceful shutdown (10 s force-exit), `requestTimeout` 60 s, `headersTimeout` 65 s, `keepAliveTimeout` 5 s. *Verified: standalone server runs clean on a custom port.*

### P3 — Product/UX coherence
- [x] ✅ **H4 Launcher path** → `MFORGE` now derived from the script location (`%~dp0..`) — works from any checkout path.
- [x] ✅ **H5 Dead tools/registry UI** → agent `allowedTools` are now real: injected into stage + writer's-room system prompts, `apply_to_current_song` executes per-stage with results recorded in `log.toolCalls` (rendered in the modal), and the static "All agent tools active" badge was replaced by a live count of tools wired into the selected pipeline. Trend tool honestly renamed (see below).
- [x] ✅ M1 unresolved `{{…}}` → pipeline now **fails the stage** with a message naming the missing inputs instead of sending raw placeholders to the LLM.
- [x] ✅ M2 built-in agent edit preserves `isBuiltIn`/`colorTheme` (spread of the original profile).
- [x] ✅ M3 stale writer's-room target agent auto-resets to a valid agent when the roster changes.
- [x] ✅ M4 stage strip renders the same `isEnabled`-filtered list the engine runs (indexes stay aligned).
- [x] ✅ M5 progress payloads are cloned snapshots (React state no longer shares mutated `logs` arrays).
- [x] ✅ M6 `customIdeas` forwarded into pipeline context/outputs (usable as `{{customIdeas}}`) and writer's-room "PRODUCTION NOTES"; API + OpenAPI updated.
- [x] ✅ M7 writer's-room prompt no longer duplicates the just-added user turn (`history.slice(0, -1)`).
- [x] ✅ M15 `"Custom Occasion"` comparisons fixed — custom occasion input is reachable and used.
- [x] ✅ M17 `callUniversalAI` unwraps Gemini `contents.parts` shapes; real image generation now server-side via `POST /api/generate-artwork` (the old text-only image path could never return `inlineData` — replaced).
- [x] ✅ M18 library import normalizes imported records + filters use `(field || "")` guards (no more crash on partial JSON).
- [x] ✅ M19 lyrics companion reports failures instead of always claiming success (`onRefine` returns boolean).
- [x] ✅ M16 BroadcastChannel snapshots read live `lyricsRef`/`songTitleRef`; `userName`/`userColor` removed from channel deps (renames propagate via 5 s heartbeat) — no more per-keystroke channel recreation or stale lyrics for joiners.
- [x] ✅ M8 Tailwind CDN replaced by build-time Tailwind v4 (`@tailwindcss/vite` + `src/index.css`; CDN script removed from `index.html`).
- [x] ✅ M9 vendor chunks split via `manualChunks` (react/d3/jspdf/genai) — main bundle 1.41 MB → 665 KB. Residual >500 kB warning remains until `index.tsx` is split into view modules.
- [x] ✅ **Artwork honesty + real generation** → `POST /api/generate-artwork` (Gemini image model server-side, `GEMINI_IMAGE_MODEL` env) returns base64 images; the modal labels the source ("AI image (server)" vs "Procedural canvas — no AI image").
- [x] ✅ **Trend tool honesty** → `search_web_music_trends` → `simulate_music_trends` ("Trend Synthesis (No Live Web)") with legacy-id migration, explicit "NOT live web" disclaimer in output, and honest Clio/pipeline/OpenAPI copy.
- [x] ✅ M11 fallback/degraded states now visible (flagged logs + UI markers).
- [x] ✅ M12 Anthropic now honors `stop_sequences` AND JSON mode (prompt-forced JSON + embedded schema).
- [x] ✅ M13 `/api/models/list` now reflects the server's real dispatch catalog — built-ins + models registered via `POST /api/models/register` (in-memory, no secrets accepted); OpenAPI documents the browser-localStorage caveat.

### P4 — Hygiene
- [x] ✅ `bun.lock` deleted (pnpm canonical); `.env.example` now lists every variable incl. server options; WORK_BREAKDOWN port fixed (`:3005`) and overclaims corrected; `PLAN.md` filled with a roadmap.
- [x] ✅ index.tsx: unused imports (`GoogleGenAI`, `DEFAULT_LLM_MODELS`, `safeExtractJSON`) removed; dead `addLog`/`canvasRef` removed; dead `HermesAgentStudioModal` component removed (307 lines); `speechSynthesis.onvoiceschanged` cleared on unmount; replay timer cleared on unmount; artwork auto-gen effect guarded by ref; `copiedIdx` reset on new enhancement; version arrays cloned on revert; `??` for virality scores (no more fake 98/95 on legit 0); `URL.revokeObjectURL` added to collab download; `Date.now()` IDs given random suffixes (recent-/song-/merged-); rhyme fetcher debounced; chord parity counts only lyric lines; `Song.musicKey` added + wired through `onApplySongUpdate`; recent-styles history now persisted.
- [x] ✅ `revisedTimes`/critic loop: **`autoCriticLoop` toggle now actually skips Stage 4** (4-critic evaluation) when off, with an execution-log entry saying so.
- [x] ✅ `tsconfig.json`: `strict: true` enabled; `@types/react`/`@types/react-dom` added; 1 real strict error fixed → `tsc --noEmit` is 0 errors under strict mode (WORK_BREAKDOWN's "100% strict" claim now true).
- [x] ✅ **`index.tsx` split into view modules** → 12.9k-line monolith reduced to ~1.8k lines (App + album step components). Shared types/constants/services extracted (`src/types.ts`, `src/constants.ts`, `src/kbDB.ts`, `src/aiShim.ts`, `src/components/shared.tsx`, `generateLyricsPdf.ts`, `exportUtils.ts`), and 20+ components live in `src/components/` loaded via `React.lazy` + Suspense. The >500 kB chunk warning is gone: main chunk 665 KB → 326 KB.
- [x] ✅ `metadata.json` capability claims updated (server-side LLM proxy + image generation are now real).
- [x] ✅ Windows port caveat: `server.on("listening")` logs confirmed port + pid; EADDRINUSE message includes netstat guidance.
- [x] ✅ False-success alerts in writer's-room apply buttons fixed (callback returns success; no-album case alerts instead of lying).

**Verification summary (2026-09-07, pass 2):** `tsc --noEmit` (strict) → 0 errors · `vite build` → OK (main chunk 665 KB, vendors split, Tailwind CSS 14 KB gzip, no CDN script, no key material in bundle) · `esbuild` server bundle → OK · live probes: dev + standalone servers serve UI/API correctly, bogus model → `error`, OpenAPI paths 9 with 400/502 responses documented, git tree clean with no conflicts.

---

## 8. Suggested Fix Order (effort ≈ impact)

1. C3 + H1 + C1 (small diffs, restore user trust immediately)
2. C6 XSS + C2 fallback flagging (small, high visibility)
3. H2 + H3 abort/timeouts (medium, prevents hangs and runaway spend)
4. H7 + C5 validation (small/medium, data integrity + API contract)
5. C4 key proxying (medium, required for any real deployment)
6. H4 + H6 + P3 items (polish)
