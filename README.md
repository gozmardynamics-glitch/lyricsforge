# 🎵 AI Lyrics Generator & Multi-Agent Songwriting Studio

**Model-Agnostic Creative Songwriting Platform & Production REST API**

---

## 🌟 Overview

**AI Lyrics Generator & Multi-Agent Studio** is a state-of-the-art songwriting suite and backend API engine. It connects multiple frontier LLMs into collaborative songwriting agents to craft hit lyrics, harmonic chord voicings, vocal melodies, and complete concept albums.

### Key Highlights
- **🧠 Model-Agnostic LLM Engine**: Seamlessly switch between **Anthropic Claude 3.7 Sonnet**, **OpenAI GPT-4o**, **Google Gemini 2.5**, **DeepSeek-V3/R1**, **Groq (Llama 3.3 70B)**, **OpenRouter**, and **local Ollama** instances.
- **🤖 Multi-Agent Orchestration**: Specialized agents for lyricism, harmony, melody, streaming trends, A&R commercial critique, and cover art direction.
- **🌐 Production REST API & OpenAPI 3.0**: Built-in backend API with live OpenAPI schema and ready-to-use SDK snippets in cURL, Python, and TypeScript.
- **🎼 Full Songwriting Toolkit**: Real-time syllable & meter scansion, rhyming dictionary, chord progression architect, D3.js mood radar analytics, interactive digital metronome, and PDF lead sheet export.

---

## 🧠 Supported LLM Providers & Models

| Provider | Supported Models | Recommended Use |
| :--- | :--- | :--- |
| **Anthropic Claude** | `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet`, `claude-3-5-haiku` | Poetic metaphors, complex emotional cadence, Claude Code workflows |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini` (Reasoning), `gpt-4.1` | Radio-ready hit structures, viral hooks, STEM music theory |
| **Google Gemini** | `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash` | Ultra-fast multimodal generation, structured JSON tool calls |
| **DeepSeek** | `deepseek-chat` (V3), `deepseek-reasoner` (R1) | High-performance songwriting, step-by-step prosody analysis |
| **Groq** | `llama-3.3-70b-versatile`, `mixtral-8x7b` | Sub-second LPU inference (300+ tokens/sec) |
| **OpenRouter** | `nous-hermes-3-70b`, `llama-3.3-70b-instruct` | Uncensored expressive lyricism & agentic steering |
| **Ollama Local** | `hermes3`, `llama3.3`, `deepseek-r1`, `mistral` | 100% private offline songwriting with zero API fees |

---

## 👥 Specialized Music Agents

- **🪶 Hermes (Master Hitmaker Lyricist)**: 3-second earworm hooks, high-tension pre-choruses, and rhythmic syllable scansion.
- **🎛️ Apollo (Executive Studio Orchestrator)**: Multi-stage songwriting pipeline coordinator and executive producer.
- **🎹 Harmonia (Harmonic Architect & Chord Master)**: Extended chord voicings (7ths, 9ths, modal interchange) and Roman numeral chord charts.
- **🎤 Calliope (Melody & Vocal Cadence Master)**: Pitch contour ladders, scale motif earworms, and open-vowel register placement.
- **🌐 Clio (Music Trends & Billboard Scout)**: Streaming trend synthesis, TikTok audio hooks, and modern cultural references.
- **🎙️ Quincy (A&R Song Critic)**: Objective commercial viability audits, cliché detection, and structural pacing scores.
- **🎨 Iris (Visual Director & Cover Aesthetician)**: Album cover art direction, color harmonies, and typography pairings.

---

## 🌐 Production REST API

The platform provides a production-ready REST API mounted at `http://localhost:3005/api/*` (and via standalone server at `src/server/index.ts`).

### Available Endpoints
- `GET /api/health` — Check server status, active LLMs, and uptime.
- `GET /api/openapi.json` — View complete OpenAPI 3.0 specification.
- `GET /api/models/list` — List all configured LLMs with speed and pricing tiers.
- `POST /api/models/test-connection` — Ping & validate connection to any model with latency measurement.
- `GET /api/agents/list` — List active agent profiles and pipeline definitions.
- `POST /api/generate-lyrics` — Generate full multi-section song lyrics across genres.
- `POST /api/agents/execute-pipeline` — Run multi-stage sequential agent pipelines.
- `POST /api/agents/writers-room` — Collaborative Writer's Room turn dispatcher.
- `POST /api/agents/tools/execute` — Execute musical tools (chords, rhymes, trends, critique).

---

## 🚀 Quick Start & Development

```bash
# Clone the repository
git clone https://github.com/gozmardynamics-glitch/musicforge.git
cd musicforge

# Install dependencies
pnpm install

# Run Development Server
pnpm run dev
# App: http://localhost:3005
# API: http://localhost:3005/api/health

# Type Check & Build
pnpm run typecheck
pnpm run build
```

---

## 📜 License
MIT License. Created by the AI Lyrics Studio team.
