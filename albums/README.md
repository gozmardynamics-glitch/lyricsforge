# Family Birthday Album Collection

Four complete birthday albums — 10 songs each (40 tracks total) — **generated through LyricsForge's Album Studio pipeline** with **3 lyric versions per song** (120 versions total).

| Album | Occasion | Songs | Versions | JSON |
| --- | --- | --- | --- | --- |
| Grandpa's Birthday — Another Candle Light | Grandpa | 10 | 3 each | `grandpa-birthday-album.json` |
| Grandma's Birthday — Candles for the Queen of Us | Grandma | 10 | 3 each | `grandma-birthday-album.json` |
| Mum's Birthday — You're the Song | Mum | 10 | 3 each | `mum-birthday-album.json` |
| Dad's Birthday — Hold the Mic | Dad | 10 | 3 each | `dad-birthday-album.json` |

## Version workflow in the app

1. Open **Album Songs Studio** for any birthday album.
2. Tracklist badges show **V3 · Primary V1** when three versions exist; **+3 versions** generates missing ones.
3. Header buttons: **⚡ Generate 3 Versions** (selected track) and **🎛 Generate 3 Versions × All Tracks**.
4. Click a track → **Song Version Studio**:
   - Function buttons: **Generate 3 Versions**, **Save Edits**, **Set Primary**, **Copy**, **Add Version**, **Delete**, **Restore**
   - **V1 / V2 / V3** version buttons (labeled Narrative / Anthem / Intimate) open each draft for editing
   - Side-by-side editor + live preview
5. Finalized Album view also has **V1/V2/V3** switches that persist the primary version.

## How to load into the app

1. **Automatic** — Open **Library**. Production Library seeds these albums on first visit.
2. **Button** — Library → **Load Birthday Collection**.
3. **Import** — **Import / Restore JSON** with `birthday-albums-library-import-full.json`.

## Pipeline used

- Shared engine: `src/agents/generateThreeLyricVersions.ts`
- UI: Album Studio + Song Version Studio
- Offline runner: `scripts/run_app_lyric_generation.ts` (same modules)
- This machine run: no live LLM API key → honest **procedural fallback** (still 3 distinct versions per track; configure Gemini/OpenAI/etc. in Settings for live AI)

See `generation-run-report.json` for per-track version counts and fallback reasons.

Regenerate through the app pipeline:

```bash
node node_modules/esbuild/bin/esbuild scripts/run_app_lyric_generation.ts --bundle --platform=node --format=cjs --outfile=scripts/run_app_lyric_generation.cjs --target=node20
node scripts/run_app_lyric_generation.cjs
```
