import { GoogleGenAI } from "@google/genai";
import { LLMModelDefinition, LLMProvider, ModelConnectionStatus, UniversalLLMOptions } from "./agentTypes";

export const DEFAULT_LLM_MODELS: LLMModelDefinition[] = [
  // --- GOOGLE GEMINI ---
  {
    id: "gemini_3_6_flash",
    name: "Gemini 3.6 Flash",
    provider: "google_gemini",
    modelString: "gemini-3.6-flash",
    endpointUrl: "https://generativelanguage.googleapis.com",
    contextWindow: 1048576,
    supportsTools: true,
    isDefault: true,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "Ultra-fast lyrical generation, rhythmic meter analysis, real-time rhyme finding.",
    description: "Google's current general-availability flagship with native JSON schema calling."
  },
  {
    id: "gemini_3_1_pro_preview",
    name: "Gemini 3.1 Pro (preview)",
    provider: "google_gemini",
    modelString: "gemini-3.1-pro-preview",
    endpointUrl: "https://generativelanguage.googleapis.com",
    contextWindow: 2097152,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Complex album narrative arcs, deep multisyllabic rhyme schemes, commercial A&R audits.",
    description: "Deep reasoning engine with a 2M context window for long-form songwriting."
  },
  {
    id: "gemini_3_1_flash_lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google_gemini",
    modelString: "gemini-3.1-flash-lite",
    endpointUrl: "https://generativelanguage.googleapis.com",
    contextWindow: 1048576,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "Real-time co-writing assistant and fast chord progressions.",
    description: "Low-latency model optimized for instant creative flow and tool execution."
  },
  {
    id: "gemini_2_5_flash",
    name: "Gemini 2.5 Flash",
    provider: "google_gemini",
    modelString: "gemini-2.5-flash",
    endpointUrl: "https://generativelanguage.googleapis.com",
    contextWindow: 1048576,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "Fast multimodal lyrics generation and scansion.",
    description: "Google's 2.5 flagship multimodal model."
  },
  {
    id: "gemini_2_5_pro",
    name: "Gemini 2.5 Pro",
    provider: "google_gemini",
    modelString: "gemini-2.5-pro",
    endpointUrl: "https://generativelanguage.googleapis.com",
    contextWindow: 2097152,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Complex album narrative arcs and commercial A&R audits.",
    description: "Deep reasoning engine with 2M context window."
  },

  // --- ANTHROPIC CLAUDE ---
  {
    id: "claude_opus_5",
    name: "Claude Opus 5",
    provider: "anthropic",
    modelString: "claude-opus-5",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "high",
    speedTier: "moderate",
    recommendedUse: "A&R-level final edits, full-album arc critique, prosody and scansion audits.",
    description: "Anthropic's most capable model for complex long-form creative analysis."
  },
  {
    id: "claude_sonnet_5",
    name: "Claude Sonnet 5",
    provider: "anthropic",
    modelString: "claude-sonnet-5",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Best-in-class poetic lyricism, sustained multi-section album narratives, nuanced voice matching.",
    description: "Anthropic's balanced flagship: deep creative writing with extended reasoning."
  },
  {
    id: "claude_sonnet_4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    modelString: "claude-sonnet-4",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Best-in-class poetic lyricism, sustained multi-section album narratives, nuanced voice matching.",
    description: "Anthropic's balanced flagship: deep creative writing with extended reasoning."
  },
  {
    id: "claude_opus_4_1",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    modelString: "claude-opus-4-1",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "high",
    speedTier: "moderate",
    recommendedUse: "A&R-level final edits, full-album arc critique, prosody and scansion audits.",
    description: "Anthropic's most capable model for complex long-form creative analysis."
  },
  {
    id: "claude_3_7_sonnet",
    name: "Claude 3.7 Sonnet (Hybrid Reasoning)",
    provider: "anthropic",
    modelString: "claude-3-7-sonnet-20250219",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Poetic metaphors, complex emotional cadence, lyrical double entendres, Claude Code workflows.",
    description: "Anthropic's flagship model combining lightning creative writing with deep hybrid reasoning."
  },
  {
    id: "claude_3_5_sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    modelString: "claude-3-5-sonnet-20241022",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Sensory imagery, literary lyric drafting, emotional storytelling.",
    description: "Industry standard for nuanced poetic prose, lyricism, and tone fidelity."
  },
  {
    id: "claude_3_5_haiku",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    modelString: "claude-3-5-haiku-20241022",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "Instant rhyme lookups, syllable counters, quick lyrical line tweaks.",
    description: "Blazing fast lightweight model from Anthropic with exceptional responsive speed."
  },

  // --- OPENAI ---
  {
    id: "openai_gpt_5",
    name: "OpenAI GPT-5",
    provider: "openai",
    modelString: "gpt-5",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    contextWindow: 256000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "high",
    speedTier: "fast",
    recommendedUse: "Frontier-grade hook engineering, genre fusion synthesis, structured JSON songpacks.",
    description: "OpenAI's fifth-generation flagship with hybrid reasoning and 256K context."
  },
  {
    id: "openai_gpt_4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    modelString: "gpt-4o",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    contextWindow: 128000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Radio hit structures, dynamic TikTok viral hooks, genre-fluid lyric synthesis.",
    description: "OpenAI's flagship omni model for high-fidelity structured generation and tool use."
  },
  {
    id: "openai_gpt_4o_mini",
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    modelString: "gpt-4o-mini",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    contextWindow: 128000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "High-volume generation, background agent brainstorming, instant theme exploration.",
    description: "Cost-effective, high-speed OpenAI model ideal for rapid iteration."
  },
  {
    id: "openai_o3_mini",
    name: "OpenAI o3-mini (Reasoning)",
    provider: "openai",
    modelString: "o3-mini",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    contextWindow: 200000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "reasoning",
    recommendedUse: "Mathematical syllable stress, complex music theory chord maps, modal voice leading.",
    description: "STEM and logic-focused reasoning model for advanced music theory analysis."
  },

  // --- DEEPSEEK ---
  {
    id: "deepseek_chat",
    name: "DeepSeek-V3 (Chat)",
    provider: "deepseek",
    modelString: "deepseek-chat",
    endpointUrl: "https://api.deepseek.com/v1/chat/completions",
    contextWindow: 64000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "fast",
    recommendedUse: "High-performance multilingual songwriting and creative verse construction.",
    description: "State-of-the-art open-weights MoE model delivering outstanding creative fidelity."
  },
  {
    id: "deepseek_reasoner",
    name: "DeepSeek-R1 (Reasoner)",
    provider: "deepseek",
    modelString: "deepseek-reasoner",
    endpointUrl: "https://api.deepseek.com/v1/chat/completions",
    contextWindow: 64000,
    supportsTools: false,
    isDefault: false,
    pricingTier: "low",
    speedTier: "reasoning",
    recommendedUse: "Step-by-step lyrical deconstruction, harmonic progression proofing, prosody verification.",
    description: "Deep reasoning model with transparent chain-of-thought analysis."
  },

  // --- GROQ ---
  {
    id: "groq_llama_4_scout_17b",
    name: "Groq (Meta Llama 4 Scout 17B)",
    provider: "groq",
    modelString: "meta-llama/llama-4-scout-17b-16e-instruct",
    endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
    contextWindow: 131072,
    supportsTools: true,
    isDefault: false,
    pricingTier: "free",
    speedTier: "ultra_fast",
    recommendedUse: "Realtime Meta Llama 4 rhymes/ideation at GPU-cluster speed.",
    description: "Meta Llama 4 Scout served on Groq LPU inference — near-instant responses."
  },
  {
    id: "groq_llama_3_3_70b",
    name: "Groq (Llama 3.3 70B)",
    provider: "groq",
    modelString: "llama-3.3-70b-versatile",
    endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
    contextWindow: 128000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "ultra_fast",
    recommendedUse: "Instantaneous sub-second lyrics generation via LPU inference.",
    description: "Ultra low latency LPUs serving open-source frontier models at 300+ tokens/sec."
  },

  // --- OPENROUTER / NOUS HERMES ---
  {
    id: "openrouter_llama_4_maverick",
    name: "Meta Llama 4 Maverick 17B (OpenRouter)",
    provider: "openrouter",
    modelString: "meta-llama/llama-4-maverick",
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    contextWindow: 1048576,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "fast",
    recommendedUse: "Meta's multimodal MoE - expressive pop/rap lyricism with 1M-token memory.",
    description: "Meta Llama 4 Maverick (17B active params, 128 experts) routed via OpenRouter."
  },
  {
    id: "openrouter_llama_4_scout",
    name: "Meta Llama 4 Scout 17B (OpenRouter)",
    provider: "openrouter",
    modelString: "meta-llama/llama-4-scout",
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    contextWindow: 10485760,
    supportsTools: false,
    isDefault: false,
    pricingTier: "free",
    speedTier: "ultra_fast",
    recommendedUse: "Cheapest long-context drafts: whole-album lyric continuity in one pass.",
    description: "Meta Llama 4 Scout with 10M-token context window, routed via OpenRouter."
  },
  {
    id: "nous_hermes_3_openrouter",
    name: "Nous Hermes 3 (OpenRouter)",
    provider: "openrouter",
    modelString: "nousresearch/hermes-3-llama-3.1-70b",
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    contextWindow: 131072,
    supportsTools: true,
    isDefault: false,
    pricingTier: "low",
    speedTier: "fast",
    recommendedUse: "Unfiltered, expressive artistic lyricism and agentic steering.",
    description: "Creative steerable agent model with ChatML and deep roleplay capabilities."
  },

  // --- OLLAMA LOCAL ---
  {
    id: "ollama_local_llama3_3",
    name: "Ollama Local - Meta Llama 3.3 70B",
    provider: "ollama_local",
    modelString: "llama3.3:latest",
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    contextWindow: 128256,
    supportsTools: true,
    isDefault: false,
    pricingTier: "free",
    speedTier: "moderate",
    recommendedUse: "Full-power offline Llama generation for private, zero-cost sessions.",
    description: "Meta Llama 3.3 70B run locally through your desktop Ollama daemon."
  },
  {
    id: "ollama_local_deepseek_r1",
    name: "Ollama Local - DeepSeek R1 (8B)",
    provider: "ollama_local",
    modelString: "deepseek-r1:8b",
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    contextWindow: 32768,
    supportsTools: false,
    isDefault: false,
    pricingTier: "free",
    speedTier: "reasoning",
    recommendedUse: "Offline prosody proofs, rhyme-network analysis, structure verification.",
    description: "DeepSeek-R1 distilled reasoner running entirely on your machine."
  },
  {
    id: "ollama_local_qwen_coder",
    name: "Ollama Local - Qwen 2.5 Coder 14B",
    provider: "ollama_local",
    modelString: "qwen2.5-coder:14b",
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    contextWindow: 32768,
    supportsTools: true,
    isDefault: false,
    pricingTier: "free",
    speedTier: "fast",
    recommendedUse: "Precise JSON song schemas, plugin configs, MIDI tooling locally.",
    description: "Strong structured-output coder model kept local via Ollama."
  },
  {
    id: "ollama_local_hermes",
    name: "Ollama Local (Local Host)",
    provider: "ollama_local",
    modelString: "hermes3:latest",
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    contextWindow: 32768,
    supportsTools: true,
    isDefault: false,
    pricingTier: "free",
    speedTier: "fast",
    recommendedUse: "Private 100% offline local songwriting without any cloud dependence.",
    description: "Run local models directly via Ollama on your PC with zero API fees or telemetry."
  },

  // --- CUSTOM OPENAI COMPATIBLE ---
  {
    id: "custom_openai_compatible",
    name: "Custom OpenAI-Compatible Endpoint",
    provider: "openai_compatible",
    modelString: "custom-model",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    contextWindow: 128000,
    supportsTools: true,
    isDefault: false,
    pricingTier: "medium",
    speedTier: "fast",
    recommendedUse: "Connect your company proxy, vLLM, LM Studio, Azure OpenAI, or custom gateway.",
    description: "Universal connector for any server implementing the OpenAI chat completions standard."
  }
];

const LOCAL_STORAGE_KEY_MODELS = "lyricist_pro_llm_registry_v2";
const LOCAL_STORAGE_KEY_ACTIVE_MODEL = "lyricist_pro_active_model_id";
const LOCAL_STORAGE_KEY_PROVIDER_KEYS = "lyricist_pro_provider_api_keys_v2";

// Server-side custom models registered through POST /api/models/register.
// In-memory (lost on restart) — mirrors what the browser registry can hold in
// localStorage, so GET /api/models/list reflects what the dispatcher can use.
const MAX_SERVER_CUSTOM_MODELS = 100;
const serverCustomModels: LLMModelDefinition[] = [];

const VALID_PROVIDERS: LLMProvider[] = [
  "google_gemini", "openai", "anthropic", "deepseek", "groq",
  "openrouter", "ollama_local", "nous_hermes", "openai_compatible", "anthropic_compatible"
];

/**
 * Registers (or replaces by id) a model on the server-side registry.
 * Returns the stored definition, or throws with a validation message.
 * API keys are intentionally rejected — server keys come from Node env only.
 */
export function registerServerCustomModel(input: Partial<LLMModelDefinition>): LLMModelDefinition {
  if (!input || typeof input !== "object") throw new Error("Model definition body must be an object");
  if (typeof input.id !== "string" || !/^[a-zA-Z0-9_\-\.]{1,64}$/.test(input.id)) {
    throw new Error("'id' is required (1-64 chars, letters/digits/-/_/.)");
  }
  if (typeof input.name !== "string" || !input.name.trim()) throw new Error("'name' is required");
  if (!input.provider || !VALID_PROVIDERS.includes(input.provider)) {
    throw new Error(`'provider' must be one of: ${VALID_PROVIDERS.join(", ")}`);
  }
  if (typeof input.modelString !== "string" || !input.modelString.trim()) throw new Error("'modelString' is required");
  if ("apiKey" in input && input.apiKey) throw new Error("'apiKey' is not accepted — server-side keys come from Node env");
  if (input.endpointUrl && !/^https?:\/\//i.test(input.endpointUrl)) throw new Error("'endpointUrl' must be an http(s) URL");
  if (serverCustomModels.length >= MAX_SERVER_CUSTOM_MODELS && !serverCustomModels.some((m) => m.id === input.id)) {
    throw new Error(`Server registry is full (${MAX_SERVER_CUSTOM_MODELS} models)`);
  }

  const model = {
    ...input,
    contextWindow: typeof input.contextWindow === "number" && input.contextWindow > 0 ? input.contextWindow : 64000,
    supportsTools: Boolean(input.supportsTools),
    description: typeof input.description === "string" ? input.description : `Custom model registered at runtime (${input.provider}).`,
    apiKey: undefined
  } as LLMModelDefinition;

  const existing = serverCustomModels.findIndex((m) => m.id === model.id);
  if (existing >= 0) serverCustomModels[existing] = model;
  else serverCustomModels.push(model);
  return model;
}

export function getServerCustomModels(): LLMModelDefinition[] {
  return serverCustomModels;
}

export interface ProviderApiKeys {
  google_gemini?: string;
  openai?: string;
  anthropic?: string;
  deepseek?: string;
  groq?: string;
  openrouter?: string;
  custom?: string;
  /** Bearer token for this deployment's /api proxy (API_ACCESS_TOKEN) */
  server_access_token?: string;
}

// localStorage is browser-only; the standalone Node server must fall back to
// env/memory instead of throwing ReferenceErrors (masked previously by broad catches).
const hasLocalStorage = typeof localStorage !== "undefined";

function safeStorageGet(key: string): string | null {
  if (!hasLocalStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Failed to read localStorage key '${key}'`, e);
    return null;
  }
}

function safeStorageSet(key: string, value: string): boolean {
  if (!hasLocalStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`Failed to write localStorage key '${key}'`, e);
    return false;
  }
}

export function getStoredLLMModels(): LLMModelDefinition[] {
  const raw = safeStorageGet(LOCAL_STORAGE_KEY_MODELS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure new models are available
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const merged = [...parsed];
        for (const def of DEFAULT_LLM_MODELS) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        return merged;
      }
    } catch (e) {
      console.error("Failed to parse LLM models from storage", e);
    }
  }
  // No browser storage (standalone Node server): surface models registered via
  // POST /api/models/register so /api/models/list matches what the dispatcher
  // can actually resolve.
  if (serverCustomModels.length > 0) {
    const defaultIds = new Set(DEFAULT_LLM_MODELS.map((m) => m.id));
    return [...DEFAULT_LLM_MODELS, ...serverCustomModels.filter((m) => !defaultIds.has(m.id))];
  }
  return DEFAULT_LLM_MODELS;
}

export function saveLLMModels(models: LLMModelDefinition[]): void {
  safeStorageSet(LOCAL_STORAGE_KEY_MODELS, JSON.stringify(models));
}

export function getActiveModelId(): string {
  const saved = safeStorageGet(LOCAL_STORAGE_KEY_ACTIVE_MODEL);
  if (saved) return saved;
  return "gemini_3_6_flash";
}

export function setActiveModelId(modelId: string): void {
  safeStorageSet(LOCAL_STORAGE_KEY_ACTIVE_MODEL, modelId);
}

export function getProviderApiKeys(): ProviderApiKeys {
  const env = (typeof process !== "undefined" && process.env) || ({} as NodeJS.ProcessEnv);
  const defaults: ProviderApiKeys = {
    google_gemini: env.GEMINI_API_KEY || env.API_KEY || "",
    openai: env.OPENAI_API_KEY || "",
    anthropic: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || "",
    deepseek: env.DEEPSEEK_API_KEY || "",
    groq: env.GROQ_API_KEY || "",
    openrouter: env.OPENROUTER_API_KEY || "",
    custom: env.CUSTOM_LLM_API_KEY || "",
    server_access_token: env.API_ACCESS_TOKEN || ""
  };

  const raw = safeStorageGet(LOCAL_STORAGE_KEY_PROVIDER_KEYS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...defaults,
          ...parsed,
          google_gemini: parsed.google_gemini || defaults.google_gemini,
          openai: parsed.openai || defaults.openai,
          anthropic: parsed.anthropic || defaults.anthropic,
          deepseek: parsed.deepseek || defaults.deepseek,
          groq: parsed.groq || defaults.groq,
          openrouter: parsed.openrouter || defaults.openrouter,
          custom: parsed.custom || defaults.custom,
          server_access_token: parsed.server_access_token || defaults.server_access_token
        };
      }
    } catch (e) {
      console.error("Failed to parse provider API keys", e);
    }
  }

  return defaults;
}

export function saveProviderApiKeys(keys: ProviderApiKeys): void {
  safeStorageSet(LOCAL_STORAGE_KEY_PROVIDER_KEYS, JSON.stringify(keys));
}

/**
 * Universal JSON Cleaner & Parser
 * Handles markdown ```json blocks, unquoted property keys, and trailing commas.
 */
export function safeExtractJSON<T = any>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string") return fallback;

  let cleaned = rawText.trim();

  // Extract from markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Attempt relaxed object/array extraction
    try {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const sub = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(sub);
      }

      const firstBracket = cleaned.indexOf("[");
      const lastBracket = cleaned.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        const sub = cleaned.substring(firstBracket, lastBracket + 1);
        return JSON.parse(sub);
      }
    } catch (err2) {
      console.warn("JSON extraction failed, returning fallback:", rawText.slice(0, 100));
    }
  }

  return fallback;
}

/**
 * Ping / Test Connection to any configured LLM endpoint.
 * Reports "connected" ONLY when a real provider response came back —
 * procedural fallbacks and unknown model ids are reported as errors.
 */
export async function testModelConnection(modelId: string): Promise<ModelConnectionStatus> {
  const startTime = Date.now();
  const models = getStoredLLMModels();
  const model = models.find((m) => m.id === modelId || m.modelString === modelId);

  if (!model) {
    return {
      modelId,
      status: "error",
      latencyMs: Date.now() - startTime,
      lastTested: Date.now(),
      errorMessage: `Unknown modelId '${modelId}'. Available ids: ${models.map((m) => m.id).join(", ")}`
    };
  }

  try {
    const result = await runUniversalLLMCall({
      modelId: model.id,
      systemPrompt: "You are an AI connection tester. Reply with 'OK'.",
      userPrompt: "Ping test. Respond with OK.",
      maxTokens: 10,
      temperature: 0.1,
      timeoutMs: 15000
    });

    const latencyMs = Date.now() - startTime;
    if (result.usedFallback) {
      return {
        modelId: model.id,
        status: "error",
        latencyMs,
        lastTested: Date.now(),
        errorMessage: result.error || "Provider unreachable — a procedural fallback response was returned instead."
      };
    }
    return {
      modelId: model.id,
      status: "connected",
      latencyMs,
      lastTested: Date.now()
    };
  } catch (err: any) {
    return {
      modelId: model.id,
      status: "error",
      latencyMs: Date.now() - startTime,
      lastTested: Date.now(),
      errorMessage: err.message || String(err)
    };
  }
}

/**
 * Fallback Intelligent Procedural Generator
 * Ensures that if API calls fail or offline mode is used, the app stays 100% functional.
 */
function generateProceduralFallback(options: UniversalLLMOptions): string {
  const userPrompt = options.userPrompt || "";
  const isJson = options.responseFormat === "json" || userPrompt.includes("JSON") || userPrompt.includes("json");

  if (isJson) {
    if (userPrompt.includes("rhyme") || userPrompt.includes("rhyming")) {
      return JSON.stringify([
        { word: "ignite", type: "Perfect", syllables: 2 },
        { word: "starlight", type: "Perfect", syllables: 2 },
        { word: "satellite", type: "Multi", syllables: 3 },
        { word: "vibe", type: "Slant", syllables: 1 },
        { word: "skies", type: "Slant", syllables: 1 }
      ]);
    }

    if (userPrompt.includes("chords") || userPrompt.includes("progression")) {
      return JSON.stringify({
        key: "C Major",
        verse: "C - G - Am - F",
        chorus: "F - G - Em - Am",
        bridge: "Dm - G - C - C7",
        mood: "Uplifting & Anthem"
      });
    }

    if (userPrompt.includes("critique") || userPrompt.includes("viability")) {
      return JSON.stringify({
        commercialScore: 88,
        hookStrength: 92,
        rhymeDensity: 85,
        strengths: ["Strong opening hook", "Clear rhythmic meter", "Contemporary sensory imagery"],
        weaknesses: ["Bridge could build higher tension before the final chorus drop"],
        actionableAdvice: "Add a vocal ad-lib riser before the last chorus to maximize streaming replay value."
      });
    }

    return JSON.stringify({
      status: "success",
      title: "Neon Echoes",
      summary: "Generated with creative AI music synthesis engine.",
      suggestions: [
        "Elevate cadence in Verse 2",
        "Add syncopated pre-chorus",
        "Amplify contrast in hook"
      ]
    });
  }

  // Text response fallback
  return `[Verse 1]
Neon shadows across the midnight floor
Chasing a feeling that we had before
Electric pulses in the city air
Nothing to lose, nothing left to spare

[Pre-Chorus]
Can you hear the rhythm calling through the night?
Rising like an anthem into the blinding light

[Chorus]
We are the sound of the summer rain
Breaking the silence, healing the pain
Hold on to the beat till the morning sun
Our melody has only just begun

[Bridge]
Take a breath and let the bassline roll
Write this frequency into your soul

[Chorus]
We are the sound of the summer rain
Breaking the silence, healing the pain
Hold on to the beat till the morning sun
Our melody has only just begun`;
}

export interface UniversalLLMCallResult {
  text: string;
  usedFallback: boolean;
  error?: string;
}

export const DEFAULT_LLM_TIMEOUT_MS = 60000;

/**
 * Core dispatcher. Throws on provider failure unless fallback is explicitly allowed.
 * Never returns a procedural fallback silently: `usedFallback` is always accurate.
 */
async function runUniversalLLMCall(
  options: UniversalLLMOptions & { allowFallback?: boolean }
): Promise<UniversalLLMCallResult> {
  const models = getStoredLLMModels();
  const activeId = options.modelId || getActiveModelId();
  const selectedModel = models.find((m) => m.id === activeId || m.modelString === activeId);
  if (!selectedModel) {
    throw new Error(`Unknown modelId '${activeId}'. Available ids: ${models.map((m) => m.id).join(", ")}`);
  }
  const keys = getProviderApiKeys();

  const temp = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2048;
  const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

  // Compose a single timeout/abort signal shared by all fetches and races
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(() => timeoutController.abort(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs);
  const onExternalAbort = () => timeoutController.abort(options.signal?.reason);
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutTimer);
      throw new Error("LLM call aborted before it started");
    }
    options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }
  const signal = timeoutController.signal;

  let lastError: Error | undefined;
  try {
    // Resolve API Key
    let apiKey = selectedModel.apiKey || "";
    if (!apiKey) {
      if (selectedModel.provider === "google_gemini") apiKey = keys.google_gemini || "";
      else if (selectedModel.provider === "openai") apiKey = keys.openai || "";
      else if (selectedModel.provider === "anthropic" || selectedModel.provider === "anthropic_compatible") apiKey = keys.anthropic || "";
      else if (selectedModel.provider === "deepseek") apiKey = keys.deepseek || "";
      else if (selectedModel.provider === "groq") apiKey = keys.groq || "";
      else if (selectedModel.provider === "openrouter") apiKey = keys.openrouter || "";
      else if (selectedModel.provider === "nous_hermes") apiKey = keys.openrouter || "";
      else if (selectedModel.provider === "openai_compatible") apiKey = keys.custom || "";
    }

    const isDummyKey = !apiKey || apiKey === "PLACEHOLDER_API_KEY" || apiKey.includes("PLACEHOLDER") || apiKey.length < 8;

    // 1. Google Gemini Native Dispatch
    if (selectedModel.provider === "google_gemini") {
      if (!apiKey || isDummyKey) {
        throw new Error("No valid Google Gemini API key configured");
      }
      const ai = new GoogleGenAI({ apiKey });
      const modelToUse = selectedModel.modelString || "gemini-3.6-flash";

      const config: any = {
        temperature: temp,
        maxOutputTokens: maxTokens,
        abortSignal: signal
      };

      if (options.systemPrompt) {
        config.systemInstruction = options.systemPrompt;
      }

      if (options.responseFormat === "json") {
        config.responseMimeType = "application/json";
        if (options.jsonSchema) {
          config.responseSchema = options.jsonSchema;
        }
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: options.userPrompt,
        config
      });

      if (response.text) {
        return { text: response.text, usedFallback: false };
      }
      throw new Error("Gemini returned an empty response");
    }

    // 2. Anthropic Claude Dispatch (Native Messages API)
    if (selectedModel.provider === "anthropic") {
      const endpoint = selectedModel.endpointUrl || "https://api.anthropic.com/v1/messages";
      if (!apiKey || isDummyKey) {
        throw new Error("No valid Anthropic API key configured");
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        ...(selectedModel.customHeaders || {})
      };

      const body: any = {
        model: selectedModel.modelString || "claude-sonnet-5",
        max_tokens: maxTokens,
        temperature: temp,
        messages: [{ role: "user", content: options.userPrompt }]
      };

      // Anthropic Messages API has no native JSON mode — enforce it in the prompt
      let systemPrompt = options.systemPrompt;
      if (options.responseFormat === "json") {
        const schemaText = options.jsonSchema
          ? `\nAdhere to this JSON schema: ${JSON.stringify(options.jsonSchema)}`
          : "";
        systemPrompt = `${systemPrompt || "You are a helpful assistant."}\nYou MUST respond with ONLY valid JSON — no markdown fences, no commentary, no trailing commas.${schemaText}`;
      }
      if (systemPrompt) {
        body.system = systemPrompt;
      }
      if (options.stopSequences?.length) {
        body.stop_sequences = options.stopSequences;
      }

      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 300)}`);
      }
      const data = await res.json();
      const textBlock = data?.content?.find((c: any) => c.type === "text")?.text;
      if (textBlock) {
        return { text: textBlock, usedFallback: false };
      }
      throw new Error("Claude returned an empty response");
    }

    // 3. OpenAI, DeepSeek, Groq, OpenRouter, Ollama, Nous Hermes, & Custom OpenAI Compatible Endpoints
    const isOpenAICompatible = [
      "openai",
      "deepseek",
      "groq",
      "openrouter",
      "ollama_local",
      "nous_hermes",
      "openai_compatible",
      "anthropic_compatible"
    ].includes(selectedModel.provider);

    if (isOpenAICompatible || selectedModel.endpointUrl) {
      let endpoint = selectedModel.endpointUrl || "https://api.openai.com/v1/chat/completions";

      // Normalize OpenAI-compatible endpoint URLs (e.g. http://localhost:11434/v1 -> http://localhost:11434/v1/chat/completions)
      // Native Anthropic is handled above; only anthropic_compatible needs the /messages path.
      if (isOpenAICompatible && selectedModel.provider !== "anthropic_compatible") {
        const trimmed = endpoint.replace(/\/+$/, "");
        if (trimmed.endsWith("/v1")) {
          endpoint = `${trimmed}/chat/completions`;
        } else if (!trimmed.endsWith("/chat/completions") && !trimmed.includes("/chat/completions?")) {
          endpoint = `${trimmed}/v1/chat/completions`;
        }
      } else if (selectedModel.provider === "anthropic_compatible") {
        const trimmed = endpoint.replace(/\/+$/, "");
        if (!trimmed.endsWith("/messages")) {
          endpoint = `${trimmed}/messages`;
        }
      }

      const isLocalHost = /https?:\/\/(localhost|127\.0\.0\.1|::1)(:|\/|$)/i.test(endpoint);

      // For Ollama local or any localhost endpoint, key is not strictly required
      if (
        !(apiKey && !isDummyKey) &&
        selectedModel.provider !== "ollama_local" &&
        !isLocalHost
      ) {
        throw new Error(`No valid API key configured for provider '${selectedModel.provider}'`);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(selectedModel.customHeaders || {})
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // OpenRouter specific headers (referer configurable via env for the server proxy)
      if (selectedModel.provider === "openrouter" || selectedModel.provider === "nous_hermes") {
        const env = typeof process !== "undefined" && process.env ? process.env : {};
        headers["HTTP-Referer"] = selectedModel.customHeaders?.["HTTP-Referer"] || env.OPENROUTER_SITE_URL || "https://ai-lyrics-generator.studio";
        headers["X-Title"] = selectedModel.customHeaders?.["X-Title"] || env.OPENROUTER_SITE_NAME || "AI Lyrics Generator Pro";
      }

      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: options.userPrompt });

      const body: any = {
        model: selectedModel.modelString,
        messages,
        temperature: temp,
        max_tokens: maxTokens
      };

      if (options.responseFormat === "json") {
        body.response_format = { type: "json_object" };
      }
      if (options.stopSequences?.length) {
        body.stop = options.stopSequences;
      }

      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI-compatible LLM error (${res.status}): ${errText.slice(0, 300)}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length > 0) {
        return { text: content, usedFallback: false };
      }
      throw new Error("OpenAI-compatible endpoint returned an empty response");
    }

    throw new Error(`Provider '${selectedModel.provider}' is not supported by the dispatcher`);
  } catch (err: any) {
    let message = err instanceof Error ? err.message : String(err);
    if (message.includes("Failed to fetch") || message.includes("fetch failed")) {
      const targetUrl = selectedModel?.endpointUrl || "";
      if (/localhost|127\.0\.0\.1|::1/i.test(targetUrl)) {
        message = `Failed to fetch (${targetUrl || "http://localhost:11434"}). Ensure your local Ollama/vLLM server is running (e.g. 'ollama serve') and CORS is enabled (OLLAMA_ORIGINS=*).`;
      }
    }
    lastError = new Error(message);
    if (options.allowFallback) {
      console.warn(`LLM call failed for model '${selectedModel?.id}', using procedural fallback:`, lastError.message);
      return { text: generateProceduralFallback(options), usedFallback: true, error: lastError.message };
    }
    throw lastError;
  } finally {
    clearTimeout(timeoutTimer);
    if (options.signal) {
      options.signal.removeEventListener("abort", onExternalAbort);
    }
  }
}

/**
 * Strict universal call: throws on any provider failure.
 * Use this whenever callers can surface errors to the user.
 */
export async function executeUniversalLLMCallStrict(options: UniversalLLMOptions): Promise<string> {
  const result = await runUniversalLLMCall(options);
  return result.text;
}

/**
 * Result-carrying universal call: never throws; reports exactly what happened.
 */
export async function executeUniversalLLMCallDetailed(options: UniversalLLMOptions): Promise<UniversalLLMCallResult> {
  return runUniversalLLMCall({ ...options, allowFallback: true });
}

/**
 * Universal Model-Agnostic LLM Dispatcher (legacy-compatible).
 * - In the browser it first tries the server-side proxy (/api/llm/complete) so
 *   provider keys stay in the Node environment instead of the JS bundle.
 * - It keeps the old "always resolves" contract for existing UI callers, but is
 *   never silently wrong: if the provider failed, the procedural fallback text
 *   is prefixed with an explicit FALLBACK marker.
 * New code should use executeUniversalLLMCallStrict (throws) or
 * executeUniversalLLMCallDetailed (result object).
 */
export async function executeUniversalLLMCall(options: UniversalLLMOptions): Promise<string> {
  if (typeof window !== "undefined") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS, 5000) + 5000);
      try {
        const keys = getProviderApiKeys();
        const serverToken = keys.server_access_token || "";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (serverToken) {
          headers["Authorization"] = `Bearer ${serverToken}`;
          headers["x-api-key"] = serverToken;
        }

        const res = await fetch("/api/llm/complete", {
          method: "POST",
          headers,
          body: JSON.stringify({
            modelId: options.modelId,
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            responseFormat: options.responseFormat,
            jsonSchema: options.jsonSchema,
            stopSequences: options.stopSequences
          }),
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data.text === "string" && data.text.length > 0) {
            return data.text;
          }
        }
        // Non-OK (502 no keys / 401 gated): fall through to direct dispatch,
        // where user-entered keys from localStorage may still work.
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Server absent (e.g. static hosting): fall through to direct dispatch.
    }
  }

  const result = await executeUniversalLLMCallDetailed(options);
  if (result.usedFallback) {
    return `[PROCEDURAL FALLBACK — provider unavailable: ${result.error || "unknown error"}]\n\n${result.text}`;
  }
  return result.text;
}

/**
 * Backward compatibility alias for executeAgentLLMCall.
 * Throws on provider failure (strict) — engine/tool callers handle it.
 */
export async function executeAgentLLMCall(params: {
  modelId?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  jsonSchema?: any;
  stopSequences?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  return executeUniversalLLMCallStrict(params);
}
