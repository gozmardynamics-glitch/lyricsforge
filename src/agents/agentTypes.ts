export type AgentCategory = 'lyrics' | 'harmony' | 'melody' | 'trends' | 'critic' | 'visuals' | 'general';

export type AgentToolId = 
  | 'search_web_music_trends'
  | 'simulate_music_trends'
  | 'generate_lyrics_structure'
  | 'rhyme_and_cadence_analyzer'
  | 'chord_progression_architect'
  | 'melody_scale_motif_builder'
  | 'critique_song_commercial_viability'
  | 'generate_album_art_direction'
  | 'apply_to_current_song';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
}

export interface AgentToolDefinition {
  id: AgentToolId;
  name: string;
  description: string;
  category: AgentCategory;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
}

export interface AgentProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  role: string;
  category: AgentCategory;
  systemPrompt: string;
  skills: string[];
  allowedTools: AgentToolId[];
  preferredModelId: string;
  temperature: number;
  maxTokens: number;
  isBuiltIn: boolean;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
  };
}

export type LLMProvider = 
  | 'google_gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'ollama_local'
  | 'nous_hermes'
  | 'openai_compatible'
  | 'anthropic_compatible';

export interface LLMModelDefinition {
  id: string;
  name: string;
  provider: LLMProvider;
  modelString: string;
  endpointUrl?: string; // e.g. "http://localhost:11434/v1" or "https://openrouter.ai/api/v1"
  apiKey?: string;
  contextWindow: number;
  supportsTools: boolean;
  isDefault?: boolean;
  description: string;
  pricingTier?: 'free' | 'low' | 'medium' | 'high';
  speedTier?: 'ultra_fast' | 'fast' | 'moderate' | 'reasoning';
  recommendedUse?: string;
  customHeaders?: Record<string, string>;
}

export interface ModelConnectionStatus {
  modelId: string;
  status: 'untested' | 'connected' | 'error';
  latencyMs?: number;
  lastTested?: number;
  errorMessage?: string;
}

export interface UniversalLLMOptions {
  modelId?: string;
  provider?: LLMProvider;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: any;
  stopSequences?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface PipelineStage {
  id: string;
  name: string;
  agentId: string;
  description: string;
  taskPromptTemplate: string;
  outputKey: string;
  dependsOn?: string[];
  isEnabled: boolean;
}

export interface PipelineExecutionLog {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  stageName: string;
  content: string;
  toolCalls?: {
    tool: string;
    input: any;
    output: any;
  }[];
}

export interface PipelineExecutionResult {
  pipelineId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentStageIndex: number;
  totalStages: number;
  logs: PipelineExecutionLog[];
  finalOutputs: Record<string, string>;
  error?: string;
}

export interface WritersRoomMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  role: 'agent' | 'user' | 'orchestrator';
  content: string;
  timestamp: number;
  toolCalls?: {
    tool: string;
    input: any;
    output: any;
  }[];
  appliedToSong?: boolean;
}
