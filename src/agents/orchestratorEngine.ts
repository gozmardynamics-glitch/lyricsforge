import { AgentProfile, PipelineExecutionLog, PipelineExecutionResult, PipelineStage, WritersRoomMessage } from "./agentTypes";
import { AVAILABLE_AGENT_TOOLS, DEFAULT_AGENTS } from "./defaultAgents";
import { executeAgentTool } from "./agentTools";
import { executeUniversalLLMCallDetailed } from "./llmRegistry";

// localStorage is browser-only; the standalone Node server uses defaults.
const hasLocalStorage = typeof localStorage !== "undefined";
const LOCAL_STORAGE_KEY_AGENTS = "lyricist_pro_agents_registry_v1";

const LEGACY_TOOL_ID_MAP: Record<string, string> = {
  search_web_music_trends: "simulate_music_trends"
};

function normalizeStoredAgents(agents: AgentProfile[]): AgentProfile[] {
  return agents.map((a) => ({
    ...a,
    allowedTools: (a.allowedTools || []).map((t) => LEGACY_TOOL_ID_MAP[t] || t) as AgentProfile["allowedTools"]
  }));
}

export function getStoredAgents(): AgentProfile[] {
  if (!hasLocalStorage) return DEFAULT_AGENTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_AGENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeStoredAgents(parsed);
      }
    }
  } catch (e) {
    console.error("Failed to load agents from storage", e);
  }
  return DEFAULT_AGENTS;
}

export function saveStoredAgents(agents: AgentProfile[]): void {
  if (!hasLocalStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_AGENTS, JSON.stringify(agents));
  } catch (e) {
    console.error("Failed to save agents to storage", e);
  }
}

export const PRECONFIGURED_PIPELINES: {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
}[] = [
  {
    id: "full_hitmaker_pipeline",
    name: "Full Hitmaker Pipeline (Trend to Master Demo)",
    description: "Trend Synthesis ➔ Lead Lyricist ➔ Harmonic Architect ➔ Melody Earworm ➔ A&R Polish ➔ Visual Director",
    stages: [
      {
        id: "stage_trends",
        name: "1. Market Trend Synthesis & References",
        agentId: "clio_trends",
        description: "Synthesizes plausible charting structures, viral tropes, and sonic references from model knowledge (no live web search).",
        taskPromptTemplate: "Synthesize hit trends and viral tropes (from your training knowledge — do not claim live web research) for the genre '{{genre}}' with the theme '{{theme}}'. Provide 3 reference tracks, ideal song pacing, and lyrical hook angles.",
        outputKey: "marketTrends",
        isEnabled: true
      },
      {
        id: "stage_lyrics",
        name: "2. Full Lyric & Hook Crafting",
        agentId: "hermes_lyricist",
        description: "Writes a complete multi-section song with 3-second earworm hooks and high-tension verses.",
        taskPromptTemplate: "Using the market trends: {{marketTrends}}\n\nWrite a complete radio-ready song for genre '{{genre}}', mood '{{mood}}', and theme '{{theme}}'. Include [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro].",
        outputKey: "fullLyrics",
        dependsOn: ["marketTrends"],
        isEnabled: true
      },
      {
        id: "stage_harmony",
        name: "3. Harmonic Progression & Modal Voicings",
        agentId: "harmonia_harmonist",
        description: "Designs section-by-section chord progressions and emotional modal color.",
        taskPromptTemplate: "Based on these lyrics:\n{{fullLyrics}}\n\nDesign the complete harmonic progression in key '{{key}}' for genre '{{genre}}'. Provide Roman numerals, chord voicings, and bassline movement for Verse, Chorus, Pre-Chorus, and Bridge.",
        outputKey: "chordProgressions",
        dependsOn: ["fullLyrics"],
        isEnabled: true
      },
      {
        id: "stage_melody",
        name: "4. Vocal Melody & Earworm Motif Guide",
        agentId: "calliope_melody",
        description: "Maps pitch contours, scale degree formulas, and vocal delivery guidance.",
        taskPromptTemplate: "Based on the chorus lyrics from:\n{{fullLyrics}}\n\nAnd chords:\n{{chordProgressions}}\n\nMap out the vocal melody pitch contour, scale degrees (e.g. 5-5-3-1), interval leaps, and vowel placement for maximum vocal impact.",
        outputKey: "melodyGuide",
        dependsOn: ["fullLyrics", "chordProgressions"],
        isEnabled: true
      },
      {
        id: "stage_ar_review",
        name: "5. Executive A&R Polish & Cliché Audit",
        agentId: "quincy_critic",
        description: "Scores commercial viability, detects tired clichés, and provides surgical polishing edits.",
        taskPromptTemplate: "Audit this track:\nGenre: {{genre}}\nLyrics:\n{{fullLyrics}}\nChords:\n{{chordProgressions}}\n\nProvide commercial viability scores (0-100), cliché index, and 3 surgical lyric upgrades.",
        outputKey: "arAudit",
        dependsOn: ["fullLyrics"],
        isEnabled: true
      },
      {
        id: "stage_visuals",
        name: "6. Album Cover & Visual Identity",
        agentId: "iris_visuals",
        description: "Generates high-impact AI cover art prompts, color palettes, and typography vibes.",
        taskPromptTemplate: "Design the album cover visual direction for song title '{{title}}' (Genre: {{genre}}, Mood: {{mood}}).\nKey lyrics snippet: {{fullLyrics}}",
        outputKey: "visualCoverArt",
        dependsOn: ["fullLyrics"],
        isEnabled: true
      }
    ]
  },
  {
    id: "quick_hook_harmony",
    name: "Quick Hook & Chords Sprint",
    description: "Lyricist + Harmonist fast collaboration for instant earworm chords & hooks.",
    stages: [
      {
        id: "stage_quick_hook",
        name: "1. Earworm Chorus & Hook",
        agentId: "hermes_lyricist",
        description: "Generates 3 explosive chorus hook options with rhythmic scansion.",
        taskPromptTemplate: "Write 3 unforgettable, ultra-catchy chorus options for a '{{genre}}' track about '{{theme}}' with mood '{{mood}}'.",
        outputKey: "chorusOptions",
        isEnabled: true
      },
      {
        id: "stage_quick_chords",
        name: "2. Matching Chords & Voicings",
        agentId: "harmonia_harmonist",
        description: "Creates lush chord voicings matching the chorus energy.",
        taskPromptTemplate: "Given these chorus hook options:\n{{chorusOptions}}\n\nCreate the perfect 4-chord and 8-chord progressions in key '{{key}}' with emotional descriptions.",
        outputKey: "quickChords",
        dependsOn: ["chorusOptions"],
        isEnabled: true
      }
    ]
  },
  {
    id: "ar_song_doctor",
    name: "A&R Song Doctor & Re-write",
    description: "Executive Producer audit + Melody Architect rewrite for existing drafts.",
    stages: [
      {
        id: "stage_doctor_audit",
        name: "1. Comprehensive Song Audit",
        agentId: "quincy_critic",
        description: "Detailed critique of current song draft.",
        taskPromptTemplate: "Review this existing song draft:\nTitle: {{title}}\nGenre: {{genre}}\nLyrics:\n{{existingLyrics}}\n\nPoint out weak rhymes, meter hiccups, and pacing issues.",
        outputKey: "doctorCritique",
        isEnabled: true
      },
      {
        id: "stage_doctor_rewrite",
        name: "2. Polished Master Rewrite",
        agentId: "hermes_lyricist",
        description: "Rewrites weak sections based on A&R feedback.",
        taskPromptTemplate: "Using the A&R critique:\n{{doctorCritique}}\n\nRewrite the song to perfection, keeping the core message but elevating the rhyme density, cadence, and hook punch.",
        outputKey: "polishedRewrite",
        dependsOn: ["doctorCritique"],
        isEnabled: true
      }
    ]
  }
];

/**
 * Builds the tool-capability block appended to agent system prompts so the LLM
 * knows which registered tools it may reference/structure output for.
 */
function buildToolInstructionBlock(agent: AgentProfile): string {
  if (!agent.allowedTools || agent.allowedTools.length === 0) return "";
  const toolDefs = AVAILABLE_AGENT_TOOLS.filter((t) => agent.allowedTools.includes(t.id));
  if (toolDefs.length === 0) return "";
  const lines = toolDefs.map((t) => `- ${t.id}: ${t.description}`);
  return `\n\nYOUR REGISTERED TOOLS:\n${lines.join("\n")}\nWhen your deliverable matches one of these tools, structure the output so it is ready for that tool (e.g. complete lyrics for generate_lyrics_structure, Roman-numeral charts for chord_progression_architect).`;
}

/**
 * Executes the agent's `apply_to_current_song` tool on a stage deliverable so
 * tool permissions are real (auditable in the execution log), not decoration.
 */
async function runApplyToolForStage(params: {
  agent: AgentProfile;
  stage: PipelineStage;
  stageOutput: string;
  context: { title: string; genre: string; mood: string; theme: string; key: string };
}): Promise<NonNullable<PipelineExecutionLog["toolCalls"]>[number] | null> {
  if (!params.agent.allowedTools.includes("apply_to_current_song")) return null;

  const isLyricStage = /lyric|hook|rewrite/i.test(params.stage.name + params.stage.outputKey);
  const isChordStage = /chord|harmon/i.test(params.stage.name + params.stage.outputKey);

  const parameters: Record<string, any> = {
    title: params.context.title,
    genre: params.context.genre,
    mood: params.context.mood,
    customIdeas: params.stageOutput
  };
  if (isLyricStage) {
    parameters.lyrics = params.stageOutput;
  } else if (isChordStage) {
    parameters.chords = params.stageOutput;
  }

  const toolResult = await executeAgentTool({
    toolId: "apply_to_current_song",
    parameters,
    modelId: params.agent.preferredModelId
  });

  return {
    tool: toolResult.toolId,
    input: parameters,
    output: {
      success: toolResult.success,
      summary: toolResult.summaryText,
      data: toolResult.data
    }
  };
}

export async function runOrchestratorPipeline(params: {
  pipeline: typeof PRECONFIGURED_PIPELINES[0];
  context: {
    title: string;
    genre: string;
    mood: string;
    theme: string;
    key: string;
    existingLyrics?: string;
    customIdeas?: string;
  };
  onProgress?: (result: PipelineExecutionResult) => void;
  signal?: AbortSignal;
}): Promise<PipelineExecutionResult> {
  const agents = getStoredAgents();
  const stages = params.pipeline.stages.filter((s) => s.isEnabled);

  const result: PipelineExecutionResult = {
    pipelineId: params.pipeline.id,
    status: "running",
    currentStageIndex: 0,
    totalStages: stages.length,
    logs: [],
    finalOutputs: {}
  };

  // Progress payloads must be snapshots — the engine keeps mutating its own state
  const emitProgress = () => {
    params.onProgress?.({
      ...result,
      logs: result.logs.map((l) => ({ ...l })),
      finalOutputs: { ...result.finalOutputs }
    });
  };

  const outputs: Record<string, string> = {
    title: params.context.title,
    genre: params.context.genre,
    mood: params.context.mood,
    theme: params.context.theme,
    key: params.context.key,
    existingLyrics: params.context.existingLyrics || "",
    customIdeas: params.context.customIdeas || ""
  };

  for (let i = 0; i < stages.length; i++) {
    if (params.signal?.aborted) {
      result.status = "error";
      result.error = `Pipeline cancelled before stage '${stages[i].name}'`;
      emitProgress();
      return result;
    }

    const stage = stages[i];
    result.currentStageIndex = i;
    emitProgress();

    const agent = agents.find((a) => a.id === stage.agentId) || agents[0];

    // Build prompt with templated variables
    let prompt = stage.taskPromptTemplate;
    Object.keys(outputs).forEach((key) => {
      prompt = prompt.split(`{{${key}}}`).join(outputs[key] || "");
    });
    // Fail loudly if a dependency was disabled/missing instead of sending raw {{placeholders}} to the LLM
    const unresolved = prompt.match(/\{\{(\w+)\}\}/g);
    if (unresolved) {
      result.status = "error";
      result.error = `Stage '${stage.name}' is missing required inputs: ${unresolved.join(", ")}. Enable the stages that produce them.`;
      emitProgress();
      return result;
    }

    try {
      const llmResult = await executeUniversalLLMCallDetailed({
        modelId: agent.preferredModelId,
        systemPrompt: agent.systemPrompt + buildToolInstructionBlock(agent),
        userPrompt: prompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        signal: params.signal
      });

      outputs[stage.outputKey] = llmResult.text;
      result.finalOutputs[stage.outputKey] = llmResult.text;

      // Honor the agent's apply_to_current_song permission — the tool runs
      // for real and is recorded in the execution log (H5).
      let toolCalls: PipelineExecutionLog["toolCalls"];
      try {
        const applyCall = await runApplyToolForStage({
          agent,
          stage,
          stageOutput: llmResult.text,
          context: params.context
        });
        if (applyCall) {
          toolCalls = [applyCall];
        }
      } catch (toolErr: any) {
        console.warn(`Tool execution failed for stage '${stage.name}':`, toolErr?.message || toolErr);
      }

      const logEntry: PipelineExecutionLog = {
        id: `log-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        agentId: agent.id,
        agentName: agent.name,
        agentAvatar: agent.avatar,
        stageName: stage.name,
        toolCalls,
        content: llmResult.usedFallback
          ? `[PROCEDURAL FALLBACK — provider unavailable: ${llmResult.error || "unknown error"}]\n\n${llmResult.text}`
          : llmResult.text
      };

      result.logs.push(logEntry);
      emitProgress();
    } catch (err: any) {
      if (params.signal?.aborted || err?.name === "AbortError") {
        result.status = "error";
        result.error = `Pipeline cancelled during stage '${stage.name}'`;
      } else {
        console.error(`Pipeline stage failed (${stage.name}):`, err);
        result.status = "error";
        result.error = `Stage '${stage.name}' failed: ${err.message || String(err)}`;
      }
      emitProgress();
      return result;
    }
  }

  result.status = "completed";
  result.currentStageIndex = stages.length;
  emitProgress();
  return result;
}

/**
 * Multi-Agent Writer's Room turn dispatcher
 */
export async function sendWritersRoomMessage(params: {
  targetAgentId: string;
  userMessage: string;
  conversationHistory: WritersRoomMessage[];
  songContext: {
    title: string;
    genre: string;
    mood: string;
    key?: string;
    lyricsSnippet?: string;
    customIdeas?: string;
  };
  signal?: AbortSignal;
}): Promise<WritersRoomMessage> {
  const agents = getStoredAgents();
  const targetAgent = agents.find((a) => a.id === params.targetAgentId) || agents[0];

  const recentHistory = params.conversationHistory.slice(-8).map((m) => {
    return `${m.agentName} (${m.role}): ${m.content}`;
  }).join("\n\n");

  const contextualSystemPrompt = `${targetAgent.systemPrompt}${buildToolInstructionBlock(targetAgent)}

CURRENT SONG CONTEXT:
- Title: "${params.songContext.title}"
- Genre: "${params.songContext.genre}"
- Mood: "${params.songContext.mood}"
${params.songContext.key ? `- Key: "${params.songContext.key}"` : ""}
${params.songContext.lyricsSnippet ? `- Active Lyrics:\n${params.songContext.lyricsSnippet.slice(0, 800)}` : ""}
${params.songContext.customIdeas ? `\nPRODUCTION NOTES (from the songwriter):\n${params.songContext.customIdeas.slice(0, 800)}` : ""}

You are participating in a live collaborative AI Songwriting Writer's Room.
Respond naturally in character as ${targetAgent.name} (${targetAgent.title}).
Engage directly with the user and other agents' ideas. Offer concrete musical solutions, lines, chords, or critiques.`;

  const userPrompt = `RECENT CONVERSATION HISTORY:\n${recentHistory || "No previous history."}\n\nUSER PROMPT / TASK: "${params.userMessage}"\n\nPlease provide your expert contribution:`;

  const llmResult = await executeUniversalLLMCallDetailed({
    modelId: targetAgent.preferredModelId,
    systemPrompt: contextualSystemPrompt,
    userPrompt,
    temperature: targetAgent.temperature,
    maxTokens: targetAgent.maxTokens,
    signal: params.signal
  });

  const responseText = llmResult.usedFallback
    ? `[PROCEDURAL FALLBACK — provider unavailable: ${llmResult.error || "unknown error"}]\n\n${llmResult.text}`
    : llmResult.text;

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    agentId: targetAgent.id,
    agentName: targetAgent.name,
    agentAvatar: targetAgent.avatar,
    role: "agent",
    content: responseText,
    timestamp: Date.now()
  };
}
