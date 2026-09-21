import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI } from "@google/genai";
import { OPENAPI_SPEC } from "./openapiSpec";
import { getProviderApiKeys, getServerCustomModels, getStoredLLMModels, registerServerCustomModel, executeUniversalLLMCallDetailed, testModelConnection } from "../agents/llmRegistry";
import { generateProceduralLyricVersions } from "../agents/proceduralLyrics";
import { AVAILABLE_AGENT_TOOLS, AVAILABLE_SKILLS, DEFAULT_AGENTS } from "../agents/defaultAgents";
import { executeAgentTool } from "../agents/agentTools";
import { getStoredAgents, PRECONFIGURED_PIPELINES, runOrchestratorPipeline, sendWritersRoomMessage } from "../agents/orchestratorEngine";
import {
  getDriveStorageStatus,
  syncLibraryToDrive,
  loadLibraryFromDrive,
  listDriveLibrary,
  writeDriveConfig,
} from "./driveStorage";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB request body cap (DoS guard)
const MAX_DRIVE_SYNC_BYTES = 12 * 1024 * 1024; // library payloads with full lyrics can be larger

/**
 * When API_ACCESS_TOKEN is set, every mutating endpoint requires
 * `Authorization: Bearer <token>` (or `x-api-key: <token>`).
 * When unset the API stays open for local development.
 */
function isAuthorized(req: IncomingMessage): boolean {
  const requiredToken = process.env.API_ACCESS_TOKEN;
  if (!requiredToken) return true;
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth === `Bearer ${requiredToken}`) return true;
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey === requiredToken) return true;
  return false;
}

const UNAUTHORIZED_BODY = {
  error: "Unauthorized � set Authorization: Bearer <API_ACCESS_TOKEN> (or x-api-key)"
};

interface ParsedBody {
  ok: boolean;
  body?: any;
  error?: string;
}

function readRequestBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<ParsedBody> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (result: ParsedBody) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        finish({ ok: false, error: `Request body exceeds ${maxBytes} byte limit` });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return finish({ ok: true, body: {} });
      try {
        finish({ ok: true, body: JSON.parse(raw) });
      } catch {
        finish({ ok: false, error: "Request body is not valid JSON" });
      }
    });
    req.on("error", (err) => finish({ ok: false, error: `Failed to read request body: ${err.message}` }));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
): Promise<void> {
  const url = req.url || "/";
  const path = url.split("?")[0];
  const method = req.method?.toUpperCase() || "GET";

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
    res.end();
    return;
  }

  // Ensure this is an /api request
  if (!path.startsWith("/api")) {
    if (next) return next();
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  const subPath = path.replace(/^\/api/, "") || "/";

  try {
    // 1. Health Endpoint
    if (subPath === "/health" && method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        version: "2.0.0",
        service: "AI Lyrics Generator & Multi-Agent Studio",
        timestamp: Date.now(),
        uptime: typeof process !== "undefined" ? process.uptime() : 0,
        activeModelsCount: getStoredLLMModels().length,
        supportedProviders: ["google_gemini", "anthropic", "openai", "deepseek", "groq", "openrouter", "ollama_local", "nous_hermes", "openai_compatible", "anthropic_compatible"]
      });
    }

    // 2. OpenAPI 3.0 Documentation Specification
    if (subPath === "/openapi.json" && method === "GET") {
      return sendJson(res, 200, OPENAPI_SPEC);
    }

    // 3. Models List � what the server's dispatcher can actually resolve:
    // built-in catalog + any models registered via POST /api/models/register.
    // (The browser additionally merges its own localStorage registry.)
    if (subPath === "/models/list" && method === "GET") {
      return sendJson(res, 200, {
        models: getStoredLLMModels(),
        serverCustomModels: getServerCustomModels().map((m) => m.id)
      });
    }

    // 3b. Register a server-side model definition (no secrets accepted)
    if (subPath === "/models/register" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      try {
        const model = registerServerCustomModel(parsed.body);
        return sendJson(res, 200, { registered: true, model });
      } catch (err: any) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    // 3c. Server-side image generation proxy (artwork). Returns base64 PNG
    // data URLs from a Gemini image model, or a clear 501/502 when not wired.
    if (subPath === "/generate-artwork" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const prompt = parsed.body.prompt;
      if (!prompt || typeof prompt !== "string") {
        return sendJson(res, 400, { error: "Missing required 'prompt' string parameter" });
      }

      const keys = getProviderApiKeys();
      const apiKey = keys.google_gemini || "";
      if (!apiKey) {
        return sendJson(res, 502, {
          generated: false,
          fallback: "procedural-canvas",
          reason: "No GEMINI_API_KEY configured on the server � image generation is unavailable."
        });
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
        const response: any = await ai.models.generateContent({
          model: imageModel,
          contents: [{ parts: [{ text: prompt }] }],
          config: { responseModalities: ["TEXT", "IMAGE"] }
        });

        for (const part of (response.candidates?.[0]?.content?.parts || [])) {
          if (part.inlineData && part.inlineData.data) {
            return sendJson(res, 200, {
              generated: true,
              model: imageModel,
              mimeType: part.inlineData.mimeType || "image/png",
              imageData: part.inlineData.data
            });
          }
        }
        return sendJson(res, 502, {
          error: "Artwork",
          generated: false,
          reason: `Image model '${imageModel}' returned no image data.`,
          fallback: "procedural-canvas"
        });
      } catch (err: any) {
        return sendJson(res, 502, {
          generated: false,
          reason: err.message || String(err),
          fallback: "procedural-canvas"
        });
      }
    }

    // 4. Test Model Connection Ping
    if (subPath === "/models/test-connection" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const modelId = parsed.body.modelId;
      if (!modelId || typeof modelId !== "string") {
        return sendJson(res, 400, { error: "Missing required 'modelId' parameter" });
      }
      const result = await testModelConnection(modelId);
      return sendJson(res, 200, result);
    }

    // 5. Agents List — stored roster (browser localStorage / defaults on Node)
    // plus skill/tool catalogs so management UIs can resolve names.
    if (subPath === "/agents/list" && method === "GET") {
      return sendJson(res, 200, {
        agents: getStoredAgents(),
        skills: AVAILABLE_SKILLS,
        tools: AVAILABLE_AGENT_TOOLS,
        pipelines: PRECONFIGURED_PIPELINES,
        builtInCount: DEFAULT_AGENTS.length
      });
    }

    // 5b. Agent management CRUD (browser-managed agents mirror via localStorage;
    // on the standalone Node server these operate on the in-process default roster).
    if (subPath === "/agents/upsert" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      if (!body || !body.id || !body.name || !body.systemPrompt) {
        return sendJson(res, 400, { error: "Agent body requires 'id', 'name', and 'systemPrompt'" });
      }
      const current = getStoredAgents();
      const idx = current.findIndex((a) => a.id === body.id);
      const existing = idx >= 0 ? current[idx] : null;
      if (existing?.isBuiltIn && body.isBuiltIn === false) {
        return sendJson(res, 400, { error: "Built-in agents cannot have isBuiltIn cleared" });
      }
      const agent = {
        ...(existing || {}),
        ...body,
        id: body.id,
        isBuiltIn: existing?.isBuiltIn ?? Boolean(body.isBuiltIn),
        colorTheme: body.colorTheme || existing?.colorTheme || DEFAULT_AGENTS[0].colorTheme
      };
      const updated = idx >= 0 ? current.map((a, i) => (i === idx ? agent : a)) : [...current, agent];
      // Save only when browser storage exists; Node keeps in-memory via getStoredAgents defaults
      try {
        const { saveStoredAgents } = await import("../agents/orchestratorEngine");
        saveStoredAgents(updated as any);
      } catch { /* Node without storage */ }
      return sendJson(res, 200, { saved: true, agent });
    }

    if (subPath === "/agents/delete" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const agentId = parsed.body?.agentId;
      if (!agentId || typeof agentId !== "string") {
        return sendJson(res, 400, { error: "Missing required 'agentId'" });
      }
      const current = getStoredAgents();
      const target = current.find((a) => a.id === agentId);
      if (!target) {
        return sendJson(res, 404, { error: `Agent '${agentId}' not found` });
      }
      if (target.isBuiltIn) {
        return sendJson(res, 400, { error: "Built-in agents cannot be deleted" });
      }
      const updated = current.filter((a) => a.id !== agentId);
      try {
        const { saveStoredAgents } = await import("../agents/orchestratorEngine");
        saveStoredAgents(updated as any);
      } catch { /* Node without storage */ }
      return sendJson(res, 200, { deleted: true, agentId, remaining: updated.length });
    }

    // 6. Generate Song Lyrics
    if (subPath === "/generate-lyrics" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      const theme = body.theme;
      const genre = body.genre;
      const mood = body.mood;
      if (!theme || !genre || !mood) {
        return sendJson(res, 400, { error: "Missing required fields: 'theme', 'genre' and 'mood' are required" });
      }
      const occasion = body.occasion || "Late Night Drive";
      const rhymeScheme = body.rhymeScheme || "ABAB / AABB";
      const language = body.language || "English";
      const modelId = body.modelId || "gemini_2_5_flash";
      const styleNote = body.styleNote || "";

      const systemPrompt = `You are Hermes, the master hitmaker lyricist and producer.
Write radio-ready, highly rhythmic song lyrics structured with clear section tags:
[Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro].
Focus on vivid sensory imagery, earworm hooks, and consistent syllable scansion.`;

      const userPrompt = `Create full song lyrics:
- Theme: ${theme}
- Genre: ${genre}
- Mood: ${mood}
- Occasion: ${occasion}
- Rhyme Scheme: ${rhymeScheme}
- Language: ${language}
${styleNote ? `- Style Direction: ${styleNote}` : ""}

Return complete lyrics with section headers.`;

      const llmResult = await executeUniversalLLMCallDetailed({
        modelId,
        systemPrompt,
        userPrompt,
        temperature: 0.85,
        maxTokens: 2500,
        responseFormat: "json",
      });

      // Album Studio clients ask for THREE versions; offline path can still serve them.
      const wantsVersions = body.versions === true || body.versionCount === 3 || String(body.versions) === "3";
      if (llmResult.usedFallback) {
        if (wantsVersions || body.allowOffline === true) {
          const versions = generateProceduralLyricVersions({
            title: body.title,
            genre,
            mood,
            customIdeas: body.theme,
            occasion,
            albumName: body.albumName || body.theme,
            structure: body.structure,
            rhymeScheme,
            language,
          }, 3);
          return sendJson(res, 200, {
            title: body.title || `${genre} Anthem - ${mood}`,
            lyricVersions: versions,
            lyricsText: versions[0].join("\n"),
            offline: true,
            usedFallback: true,
            fallbackReason: llmResult.error || "Provider unavailable",
            genre,
            mood,
            occasion,
            language,
            modelUsed: modelId,
            generatedAt: Date.now()
          });
        }
        return sendJson(res, 502, {
          error: "LLM provider unavailable — no live lyrics were generated",
          detail: llmResult.error || "Provider call failed. Set body.allowOffline=true to receive 3 procedural lyric versions.",
          modelRequested: modelId
        });
      }

      // Live model path: parse lyricVersions if present, else wrap single draft + pad to 3
      let lyricVersions: string[][] = [];
      const rawText = llmResult.text || "";
      try {
        const first = rawText.indexOf("{");
        const last = rawText.lastIndexOf("}");
        const jsonSlice = first !== -1 && last > first ? rawText.slice(first, last + 1) : rawText;
        const parsed = JSON.parse(jsonSlice);
        if (Array.isArray(parsed?.lyricVersions)) {
          lyricVersions = parsed.lyricVersions
            .map((v: any) => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split("\n") : []))
            .filter((v: string[]) => v.length > 0);
        }
      } catch { /* free-text lyrics */ }

      if (lyricVersions.length === 0 && rawText && !rawText.startsWith("[PROCEDURAL")) {
        lyricVersions = [rawText.split("\n").filter(Boolean)];
      }

      // Album Studio contract: always return THREE versions (pad with procedural variants)
      if (lyricVersions.length < 3 || (body.versions === true || body.versionCount === 3 || String(body.versions) === "3")) {
        const padSrc = generateProceduralLyricVersions({
          title: body.title,
          genre,
          mood,
          customIdeas: body.theme,
          occasion,
          albumName: body.albumName || body.theme,
          structure: body.structure,
          rhymeScheme,
          language,
        }, 3);
        while (lyricVersions.length < 3) {
          lyricVersions.push([...(padSrc[lyricVersions.length % 3] || [])]);
        }
        lyricVersions = lyricVersions.slice(0, 3).map((v, i) => (v.length ? v : [...(padSrc[i] || [])]));
      }

      return sendJson(res, 200, {
        title: body.title || `${genre} Anthem - ${mood}`,
        lyricVersions,
        lyricsText: lyricVersions[0].join("\n"),
        genre,
        mood,
        occasion,
        language,
        modelUsed: modelId,
        generatedAt: Date.now()
      });
    }

    // 7. Execute Multi-Agent Pipeline
    if (subPath === "/agents/execute-pipeline" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      if (!body.title || !body.genre || !body.theme) {
        return sendJson(res, 400, { error: "Missing required fields: 'title', 'genre' and 'theme' are required" });
      }
      const pipelineId = body.pipelineId || "full_hitmaker_pipeline";
      const pipeline = PRECONFIGURED_PIPELINES.find((p) => p.id === pipelineId);
      if (!pipeline) {
        return sendJson(res, 400, {
          error: `Unknown pipelineId '${pipelineId}'.`,
          validPipelineIds: PRECONFIGURED_PIPELINES.map((p) => p.id)
        });
      }

      const result = await runOrchestratorPipeline({
        pipeline,
        context: {
          title: body.title,
          genre: body.genre,
          mood: body.mood || "Euphoric",
          theme: body.theme,
          key: body.key || "C Major",
          existingLyrics: body.existingLyrics || "",
          customIdeas: typeof body.customIdeas === "string" ? body.customIdeas : ""
        }
      });

      // Completed without fallback → 200; anything else (error, cancel, fallback) → 502
      const statusCode = result.status === "completed" && !result.usedFallback ? 200 : 502;
      return sendJson(res, statusCode, result);
    }

    // 8. Collaborative Writer's Room
    if (subPath === "/agents/writers-room" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      if (!body.userMessage) {
        return sendJson(res, 400, { error: "Missing required 'userMessage' parameter" });
      }
      const targetAgentId = body.targetAgentId || "hermes_lyricist";
      const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
      const songContext = (body.songContext && typeof body.songContext === "object" ? body.songContext : {
        title: "Demo Track",
        genre: "Pop",
        mood: "Energetic"
      });
      if (typeof songContext.customIdeas !== "string") {
        songContext.customIdeas = "";
      }

      const reply = await sendWritersRoomMessage({
        targetAgentId,
        userMessage: body.userMessage,
        conversationHistory,
        songContext
      });

      return sendJson(res, 200, reply);
    }

    // 9. Execute Agent Tool Directly
    if (subPath === "/agents/tools/execute" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      const toolId = body.toolId;
      const parameters = body.parameters || {};
      const modelId = body.modelId;

      if (!toolId) {
        return sendJson(res, 400, { error: "Missing required 'toolId' parameter" });
      }

      const toolResult = await executeAgentTool({
        toolId,
        parameters,
        modelId
      });

      return sendJson(res, 200, toolResult);
    }

    // 10. Google Drive primary storage
    if (subPath === "/drive/status" && method === "GET") {
      return sendJson(res, 200, getDriveStorageStatus());
    }

    if (subPath === "/drive/list" && method === "GET") {
      return sendJson(res, 200, listDriveLibrary());
    }

    if (subPath === "/drive/sync" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const parsed = await readRequestBody(req, MAX_DRIVE_SYNC_BYTES);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body || {};
      const payload = {
        albums: Array.isArray(body.albums) ? body.albums : [],
        songs: Array.isArray(body.songs) ? body.songs : [],
        meta: body.meta && typeof body.meta === "object" ? body.meta : { source: "api/drive/sync" },
      };
      if (payload.albums.length === 0 && payload.songs.length === 0) {
        return sendJson(res, 400, { error: "Nothing to sync — provide non-empty 'albums' and/or 'songs'" });
      }
      const result = syncLibraryToDrive(payload);
      if (!result.ok) {
        return sendJson(res, 503, {
          error: result.error || "Google Drive sync failed",
          drive: getDriveStorageStatus(),
        });
      }
      writeDriveConfig({
        primary: true,
        lastSyncAt: Date.now(),
        lastSyncSource: "api/drive/sync",
        albumCount: payload.albums.length,
        songCount: payload.songs.length,
      });
      return sendJson(res, 200, {
        synced: true,
        ...result,
        drive: getDriveStorageStatus(),
      });
    }

    if (subPath === "/drive/load" && method === "GET" || subPath === "/drive/load" && method === "POST") {
      if (method === "POST" && !isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      let backupFolder: string | undefined;
      if (method === "POST") {
        const parsed = await readRequestBody(req, MAX_BODY_BYTES);
        if (!parsed.ok) return sendJson(res, 400, { error: parsed.error });
        backupFolder = parsed.body?.backupFolder;
      } else {
        const q = (req.url || "").split("?")[1] || "";
        const params = new URLSearchParams(q);
        backupFolder = params.get("backupFolder") || undefined;
      }
      const loaded = loadLibraryFromDrive(backupFolder);
      if (!loaded.ok || !loaded.data) {
        return sendJson(res, 404, { error: loaded.error || "No Drive library found", drive: getDriveStorageStatus() });
      }
      return sendJson(res, 200, {
        loaded: true,
        source: loaded.source,
        albums: loaded.data.albums || [],
        songs: loaded.data.songs || [],
        meta: loaded.data.meta || {},
        drive: getDriveStorageStatus(),
      });
    }

    if (subPath === "/drive/set-primary" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }
      const status = getDriveStorageStatus();
      if (!status.available) {
        return sendJson(res, 503, { error: status.note, drive: status });
      }
      writeDriveConfig({ primary: true, enabledAt: Date.now(), note: "Set primary via API" });
      return sendJson(res, 200, { primary: true, drive: getDriveStorageStatus() });
    }

    // 10. Server-side LLM completion proxy.
    // Keeps provider API keys on the server (Node env / --env-file) so the
    // browser bundle never contains them. Optional token gate via API_ACCESS_TOKEN.
    if (subPath === "/llm/complete" && method === "POST") {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, UNAUTHORIZED_BODY);
      }

      const parsed = await readRequestBody(req);
      if (!parsed.ok) {
        return sendJson(res, 400, { error: parsed.error });
      }
      const body = parsed.body;
      if (!body.userPrompt || typeof body.userPrompt !== "string") {
        return sendJson(res, 400, { error: "Missing required 'userPrompt' string parameter" });
      }

      const llmResult = await executeUniversalLLMCallDetailed({
        modelId: body.modelId,
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        responseFormat: body.responseFormat,
        jsonSchema: body.jsonSchema,
        stopSequences: body.stopSequences
      });

      if (llmResult.usedFallback) {
        return sendJson(res, 502, {
          error: "LLM provider unavailable",
          detail: llmResult.error || "Provider call failed",
          modelRequested: body.modelId || null
        });
      }

      return sendJson(res, 200, { text: llmResult.text, modelId: body.modelId || null });
    }

    // Unmatched API endpoint
    return sendJson(res, 404, {
      error: `API route '${subPath}' not found. See GET /api/openapi.json for full API specifications.`
    });
  } catch (err: any) {
    console.error("API error:", err);
    return sendJson(res, 500, {
      error: "Internal Server Error",
      message: err.message || String(err)
    });
  }
}
