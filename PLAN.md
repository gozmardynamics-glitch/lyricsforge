# MusicForge — Plan

Current focus: hardening the songwriting platform. See `report.md` for the audit,
fix history, and the live checklist of remaining work.

## Done (fix passes 1 & 2)
- Connection-tester honesty, procedural-fallback flagging, API input validation
- Server-side LLM key proxy (`/api/llm/complete`) — no keys in the client bundle
- XSS escape in the lyric renderer, pipeline-ID contract, cancellable pipelines
- Bulk-approve data loss, launcher path, Node-safe storage, docs/hygiene
- Server lifecycle (graceful shutdown, timeouts), OpenAPI 400/502 sync
- Tailwind build-time (CDN removed), vendor chunk splitting (1.41 MB → 665 KB)
- strict TypeScript enabled (0 errors), dead code removed, BroadcastChannel fixed,
  rhyme debounce, chord parity, recent-styles persistence, `musicKey` wiring

## Next
- [ ] Wire agent `allowedTools` into pipeline/writer's-room execution (or remove dead UI)
- [ ] Forward `customIdeas` into agent prompts
- [ ] Split `index.tsx` (~12.7k lines) into `src/components/` view modules
      (resolves the last >500 kB chunk warning)
- [ ] Optional token auth on all mutating API endpoints
- [ ] Sync `/api/models/list` with the browser registry (or keep as documented static catalog)
