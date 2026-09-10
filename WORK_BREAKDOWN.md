# AI Lyrics Generator & Multi-Agent Songwriting Studio — Work Breakdown & System Architecture

## 1. Executive Summary & Overview
The **AI Lyrics Generator & Multi-Agent Studio** is a model-agnostic, production-grade songwriting platform. It empowers artists, producers, and developers to co-create radio-ready song lyrics, harmonic chord voicings, vocal melodies, and complete concept albums using frontier LLMs (Anthropic Claude 3.7 Sonnet, OpenAI GPT-4o, Google Gemini 2.5, DeepSeek-V3/R1, Groq, OpenRouter, and local Ollama instances).

---

## 2. Completed Milestones & Architectural Enhancements

### A. Model-Agnostic LLM Engine (`src/agents/llmRegistry.ts` & `src/agents/agentTypes.ts`)
- **Universal Provider Dispatcher**: Routes prompt requests transparently across:
  - **Anthropic Claude & Claude Code**: Native `/v1/messages` integration supporting Claude 3.7 Sonnet (Hybrid Reasoning), Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude Opus.
  - **OpenAI**: `/v1/chat/completions` integration supporting GPT-4o, GPT-4o-mini, o3-mini (Reasoning), and GPT-4.1.
  - **Google Gemini**: Gemini 2.5 Flash, Gemini 2.5 Pro, and Gemini 2.0 Flash via GoogleGenAI SDK and REST endpoints.
  - **DeepSeek**: DeepSeek-V3 (`deepseek-chat`) and DeepSeek-R1 (`deepseek-reasoner`).
  - **Groq**: Llama 3.3 70B and Mixtral 8x7B for sub-second LPU generation.
  - **OpenRouter & Nous Hermes**: Steerable creative models with function calling.
  - **Ollama / Local LLM**: 100% private offline inference (`http://localhost:11434/v1`).
  - **Custom OpenAI-Compatible Gateways**: Custom base URLs, auth headers, and proxies.
- **Provider API Keys Management**: Secure client-side local storage with runtime environment variable fallback.
- **Active Model Quick Switcher**: Real-time dropdown in the top header and Agent Studio.
- **Connection Health Check & Latency Ping**: Tests endpoint availability with measured response times.
- **Creative Procedural Fallback**: High-fidelity music synthesis fallback ensuring offline resilience.

---

### B. Specialized Music Agents (`src/agents/defaultAgents.ts` & `src/agents/orchestratorEngine.ts`)
1. **Hermes (Master Hitmaker Lyricist)**: 3-second earworm hooks, dynamic tension pre-choruses, and rhythmic meter alignment.
2. **Apollo (Executive Studio Orchestrator)**: Multi-stage pipeline coordinator and executive producer.
3. **Harmonia (Harmonic Architect & Chord Master)**: Extended voicings (7ths, 9ths, sus4, modal interchange) and Roman numeral chord charts.
4. **Calliope (Melody & Vocal Cadence Master)**: Pitch contour ladders, scale motif earworms, and open-vowel register tips.
5. **Clio (Music Trends & Billboard Scout)**: Streaming trend synthesis, viral TikTok audio hooks, and modern cultural references.
6. **Quincy (A&R Song Critic)**: Objective commercial viability audits, cliché detection, and structural pacing scores.
7. **Iris (Visual Director & Cover Aesthetician)**: Album artwork concepts, typography pairings, and color palettes.
8. **Custom Agent Creator**: In-app profile editor with customizable system prompts and tool permissions.

---

### C. Production REST API & OpenAPI 3.0 (`src/server/apiRouter.ts`, `src/server/openapiSpec.ts`, `src/server/index.ts`)
- **Vite Dev Server Middleware**: Mounted directly at `http://localhost:3005/api/*`.
- **Standalone Server**: Node HTTP server (`src/server/index.ts`) ready for Docker / cloud deployments.
- **Key Production Endpoints**:
  - `GET /api/health` — Service health, active models, and uptime status.
  - `GET /api/openapi.json` — Complete OpenAPI 3.0 specification.
  - `GET /api/models/list` — Supported LLM models with context windows and speed ratings.
  - `POST /api/models/test-connection` — Live ping test with roundtrip latency measurement.
  - `GET /api/agents/list` — Available music agents and pipeline definitions.
  - `POST /api/generate-lyrics` — Generate full multi-section song lyrics across genres.
  - `POST /api/agents/execute-pipeline` — Execute multi-stage sequential agent pipelines.
  - `POST /api/agents/writers-room` — Collaborative multi-agent conversation turn dispatcher.
  - `POST /api/agents/tools/execute` — Execute individual musical tools (chords, rhymes, trends, critique).

---

### D. User Interface & Workflow Capabilities (`index.tsx` & `src/components/AgentOrchestratorStudioModal.tsx`)
- **Global Header**:
  - Live Model Quick-Selector dropdown.
  - REST API & OpenAPI documentation modal with instant cURL / Python / TypeScript code copy.
  - Digital Metronome (BPM tap tempo, time signatures, visual pendulum).
  - Drafts & Version History drawer with 1-click restore.
  - Text-to-Speech (TTS) lyrics narration.
  - High Contrast Light / Dark Studio theme switcher.
- **Studio Views**:
  - **Quick Theme Generator**: Single-song generation across styles and custom prompts.
  - **Autonomous Virality Agent Studio**: 6-stage hit creation engine with 4-critic evaluation loop.
  - **Album Studio**: Concept album creation with multi-track narrative story arcs.
  - **Album Songs Studio**: Detailed verse/chorus editor with rhyme lookups and AI line enhancement.
  - **Library & Analytics**: D3.js interactive emotional mood radar chart and album manager.
  - **Style Templates**: Reusable artist presets and prompt recipes.

---

## 3. Verification & Quality Assurance
- **TypeScript**: Type-safe codebase verified via `tsc --noEmit` (zero errors; strict-mode migration tracked in report.md).
- **Vite Build**: Production bundle generated in `dist/` with no compile errors (bundle-size/code-splitting improvements tracked in report.md).
- **API Test Suite**: 14 automated integration tests validating health, OpenAPI schema, ping tests, lyrics generation, writer's room, tool execution, and frontend bundle delivery.
