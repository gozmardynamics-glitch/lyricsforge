import React, { useState, useEffect, useRef } from "react";
import { AgentProfile, AgentToolId, LLMModelDefinition, PipelineExecutionResult, WritersRoomMessage } from "../agents/agentTypes";
import { AVAILABLE_AGENT_TOOLS, AVAILABLE_SKILLS } from "../agents/defaultAgents";
import { getStoredLLMModels } from "../agents/llmRegistry";
import { getStoredAgents, PRECONFIGURED_PIPELINES, runOrchestratorPipeline, saveStoredAgents, sendWritersRoomMessage } from "../agents/orchestratorEngine";

interface AgentOrchestratorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSongContext?: {
    id?: string;
    title: string;
    genre: string;
    mood: string;
    key?: string;
    lyrics?: string[][];
    customIdeas?: string;
  };
  onApplySongUpdate?: (update: {
    title?: string;
    lyricsText?: string;
    genre?: string;
    mood?: string;
    key?: string;
    customIdeas?: string;
  }) => boolean | void;
}

export const AgentOrchestratorStudioModal: React.FC<AgentOrchestratorStudioModalProps> = ({
  isOpen,
  onClose,
  activeSongContext,
  onApplySongUpdate
}) => {
  const [activeTab, setActiveTab] = useState<"pipeline" | "writersRoom" | "registry" | "llmModels" | "externalExport">("pipeline");

  // Agents & Models state
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [models, setModels] = useState<LLMModelDefinition[]>([]);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState<AgentProfile | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Pipeline State
  const [selectedPipelineId, setSelectedPipelineId] = useState(PRECONFIGURED_PIPELINES[0].id);
  const [pipelineTitle, setPipelineTitle] = useState(activeSongContext?.title || "Neon Symphony");
  const [pipelineGenre, setPipelineGenre] = useState(activeSongContext?.genre || "Synthwave Pop");
  const [pipelineMood, setPipelineMood] = useState(activeSongContext?.mood || "Nostalgic & Euphoric");
  const [pipelineTheme, setPipelineTheme] = useState("Escaping a neon city at midnight with someone you love");
  const [pipelineKey, setPipelineKey] = useState(activeSongContext?.key || "D Minor");
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const pipelineAbortRef = useRef<AbortController | null>(null);

  // Writer's Room State
  const [writersMessages, setWritersMessages] = useState<WritersRoomMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedTargetAgentId, setSelectedTargetAgentId] = useState("orchestrator_apollo");
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agent Form State
  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState("🎵");
  const [formTitle, setFormTitle] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCategory, setFormCategory] = useState<any>("lyrics");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [formTools, setFormTools] = useState<AgentToolId[]>([]);
  const [formModelId, setFormModelId] = useState("gemini_2_5_flash");
  const [formTemp, setFormTemp] = useState(0.7);
  const [formTokens, setFormTokens] = useState(2048);

  // Load initial data + re-seed pipeline brief from the active song every time
  // the modal opens (the modal stays mounted, so mount-time seeds go stale).
  useEffect(() => {
    if (isOpen) {
      setAgents(getStoredAgents());
      setModels(getStoredLLMModels());

      if (activeSongContext) {
        if (activeSongContext.title) setPipelineTitle(activeSongContext.title);
        if (activeSongContext.genre) setPipelineGenre(activeSongContext.genre);
        if (activeSongContext.mood) setPipelineMood(activeSongContext.mood);
        if (activeSongContext.key) setPipelineKey(activeSongContext.key);
      }

      if (writersMessages.length === 0) {
        setWritersMessages([
          {
            id: "msg-init-1",
            agentId: "orchestrator_apollo",
            agentName: "Apollo Orchestrator",
            agentAvatar: "⚡",
            role: "orchestrator",
            content: `Welcome to the AI Music Writer's Room! I'm Apollo, your executive producer. Hermes (Lyrics), Harmonia (Chords), Calliope (Melody), Clio (Trends), Quincy (A&R), and Iris (Visuals) are assembled. What are we creating today?`,
            timestamp: Date.now()
          }
        ]);
      }
    }
    // writersMessages intentionally excluded: seed once, empty check handles it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep the writer's-room target selection valid when the roster changes
  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === selectedTargetAgentId)) {
      setSelectedTargetAgentId(agents[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [writersMessages]);

  if (!isOpen) return null;

  // Handlers
  const handleRunPipeline = async () => {
    const pipeline = PRECONFIGURED_PIPELINES.find((p) => p.id === selectedPipelineId) || PRECONFIGURED_PIPELINES[0];
    setIsPipelineRunning(true);

    const abortController = new AbortController();
    pipelineAbortRef.current = abortController;

    const initialResult: PipelineExecutionResult = {
      pipelineId: pipeline.id,
      status: "running",
      currentStageIndex: 0,
      totalStages: pipeline.stages.filter((s) => s.isEnabled).length,
      logs: [],
      finalOutputs: {}
    };
    setPipelineResult(initialResult);

    const existingLyricsText = activeSongContext?.lyrics?.[0]?.join("\n") || "";

    try {
      const res = await runOrchestratorPipeline({
        pipeline,
        context: {
          title: pipelineTitle,
          genre: pipelineGenre,
          mood: pipelineMood,
          theme: pipelineTheme,
          key: pipelineKey,
          existingLyrics: existingLyricsText,
          customIdeas: activeSongContext?.customIdeas || ""
        },
        onProgress: (updated) => {
          setPipelineResult({ ...updated });
        },
        signal: abortController.signal
      });

      setPipelineResult(res);
    } catch (err: any) {
      setPipelineResult({
        pipelineId: pipeline.id,
        status: "error",
        currentStageIndex: 0,
        totalStages: initialResult.totalStages,
        logs: [],
        finalOutputs: {},
        error: err?.message || String(err)
      });
    } finally {
      pipelineAbortRef.current = null;
      setIsPipelineRunning(false);
    }
  };

  const handleStopPipeline = () => {
    pipelineAbortRef.current?.abort();
  };

  const handleClose = () => {
    // Terminating in-flight work prevents closed modals from burning LLM calls
    pipelineAbortRef.current?.abort();
    onClose();
  };

  const handleApplyPipelineOutputs = () => {
    if (!pipelineResult?.finalOutputs) return;
    const outputs = pipelineResult.finalOutputs;

    const lyricsText = outputs.fullLyrics || outputs.polishedRewrite || outputs.chorusOptions || "";
    const chordText = outputs.chordProgressions || outputs.quickChords || "";
    const ideasText = [
      outputs.melodyGuide ? `[Vocal Melody Guide]:\n${outputs.melodyGuide}` : "",
      outputs.arAudit ? `[A&R Commercial Audit]:\n${outputs.arAudit}` : "",
      outputs.marketTrends ? `[Market Trends & References]:\n${outputs.marketTrends}` : "",
      outputs.visualCoverArt ? `[Visual Art Direction]:\n${outputs.visualCoverArt}` : "",
      chordText ? `[Chord Charts]:\n${chordText}` : ""
    ].filter(Boolean).join("\n\n");

    if (!onApplySongUpdate) {
      alert("No active song workspace — open a song/album first, then apply pipeline results.");
      return;
    }

    const applied = onApplySongUpdate({
      title: pipelineTitle,
      genre: pipelineGenre,
      mood: pipelineMood,
      key: pipelineKey,
      lyricsText: lyricsText || undefined,
      customIdeas: ideasText || undefined
    });

    if (applied === false) {
      alert("Could not apply results — no active song in the workspace.");
    } else {
      alert("✨ Pipeline results successfully applied to active song workspace!");
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAgentReplying) return;

    const userMsg: WritersRoomMessage = {
      id: `msg-user-${Date.now()}`,
      agentId: "user",
      agentName: "You (Songwriter)",
      agentAvatar: "👤",
      role: "user",
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    const updatedHistory = [...writersMessages, userMsg];
    setWritersMessages(updatedHistory);
    setInputMessage("");
    setIsAgentReplying(true);

    try {
      const activeLyrics = activeSongContext?.lyrics?.[0]?.join("\n") || "";
      const reply = await sendWritersRoomMessage({
        targetAgentId: selectedTargetAgentId,
        userMessage: userMsg.content,
        // The just-added user turn is sent as userMessage — exclude it from history
        conversationHistory: updatedHistory.slice(0, -1),
        songContext: {
          title: activeSongContext?.title || pipelineTitle,
          genre: activeSongContext?.genre || pipelineGenre,
          mood: activeSongContext?.mood || pipelineMood,
          key: activeSongContext?.key || pipelineKey,
          lyricsSnippet: activeLyrics,
          customIdeas: activeSongContext?.customIdeas || ""
        }
      });

      // Cap the rendered history at the last 100 messages (the engine only
      // uses the last 8 for context; unbounded state was pure memory growth)
      setWritersMessages((prev) => [...prev.slice(-99), reply]);
    } catch (err: any) {
      setWritersMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          agentId: "orchestrator_apollo",
          agentName: "Apollo Orchestrator",
          agentAvatar: "⚡",
          role: "orchestrator",
          content: `Agent response error: ${err.message || String(err)}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsAgentReplying(false);
    }
  };

  const handleSaveCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSystemPrompt.trim()) return;

    const newAgentFields: AgentProfile = {
      id: "",
      name: formName.trim(),
      avatar: formAvatar.trim() || "🤖",
      title: formTitle.trim() || "Custom Specialist",
      role: formRole.trim() || "Creative assistant",
      category: formCategory,
      systemPrompt: formSystemPrompt.trim(),
      skills: formSkills,
      allowedTools: formTools,
      preferredModelId: formModelId,
      temperature: formTemp,
      maxTokens: formTokens,
      isBuiltIn: false,
      colorTheme: {
        bg: "bg-teal-950/40",
        border: "border-teal-500/50",
        text: "text-teal-300",
        badge: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        glow: "shadow-teal-500/20"
      }
    };

    let updated: AgentProfile[];
    if (selectedAgentForEdit) {
      // Preserve identity fields (isBuiltIn, colorTheme) the form doesn't manage
      const edited: AgentProfile = {
        ...selectedAgentForEdit,
        name: formName.trim(),
        avatar: formAvatar.trim() || "🤖",
        title: formTitle.trim() || "Custom Specialist",
        role: formRole.trim() || "Creative assistant",
        category: formCategory,
        systemPrompt: formSystemPrompt.trim(),
        skills: formSkills,
        allowedTools: formTools,
        preferredModelId: formModelId,
        temperature: formTemp,
        maxTokens: formTokens
      };
      updated = agents.map((a) => (a.id === selectedAgentForEdit.id ? edited : a));
    } else {
      const newAgent: AgentProfile = { ...newAgentFields, id: `agent_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
      updated = [...agents, newAgent];
    }

    setAgents(updated);
    saveStoredAgents(updated);
    setIsCreatingAgent(false);
    setSelectedAgentForEdit(null);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      const updated = agents.filter((a) => a.id !== agentId);
      setAgents(updated);
      saveStoredAgents(updated);
    }
  };

  const handleResetAgents = () => {
    if (confirm("Reset agent roster to default built-in team?")) {
      localStorage.removeItem("lyricist_pro_agents_registry_v1");
      setAgents(getStoredAgents());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[120] p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="bg-gray-900 border border-teal-500/40 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-950 via-teal-950/80 to-gray-950 p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500/20 to-amber-500/20 rounded-xl border border-teal-400/40 text-teal-300 shadow-md">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">Agentic Studio & Multi-Agent Orchestrator</h3>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Automated Pipeline
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Autonomous multi-agent pipelines, live collaborative Writer's Room, custom agent builder & LLM model registry.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 text-2xl font-bold rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 bg-gray-950/90 px-4 sm:px-6 pt-2 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "pipeline" ? "bg-gray-900 text-teal-300 border-t-2 border-teal-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-gray-900/50"
            }`}
          >
            <span>🚀 Automated Pipelines</span>
          </button>
          <button
            onClick={() => setActiveTab("writersRoom")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "writersRoom" ? "bg-gray-900 text-teal-300 border-t-2 border-teal-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-gray-900/50"
            }`}
          >
            <span>🎙️ Writer's Room Live</span>
            {writersMessages.length > 1 && (
              <span className="text-[10px] bg-teal-900 text-teal-200 px-1.5 py-0.2 rounded-full font-bold">{writersMessages.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("registry")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "registry" ? "bg-gray-900 text-teal-300 border-t-2 border-teal-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-gray-900/50"
            }`}
          >
            <span>👥 Agent Roster ({agents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("llmModels")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "llmModels" ? "bg-gray-900 text-teal-300 border-t-2 border-teal-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-gray-900/50"
            }`}
          >
            <span>🧠 LLM Model Registry</span>
          </button>
          <button
            onClick={() => setActiveTab("externalExport")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "externalExport" ? "bg-gray-900 text-teal-300 border-t-2 border-teal-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-gray-900/50"
            }`}
          >
            <span>🔌 External Agent Bridge</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-900 space-y-6">
          {/* TAB 1: AUTOMATED PIPELINE RUNNER */}
          {activeTab === "pipeline" && (
            <div className="space-y-6">
              {/* Pipeline Selection & Briefing Card */}
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚡ Master Orchestrator Pipeline</span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Select a workflow to autonomously coordinate your specialized AI agent team from concept to complete track.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPipelineId}
                      onChange={(e) => setSelectedPipelineId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-teal-300 font-bold text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                    >
                      {PRECONFIGURED_PIPELINES.map((pipe) => (
                        <option key={pipe.id} value={pipe.id}>
                          {pipe.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Briefing inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Song Title</label>
                    <input
                      type="text"
                      value={pipelineTitle}
                      onChange={(e) => setPipelineTitle(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      placeholder="e.g. Electric Dreams"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Genre</label>
                    <input
                      type="text"
                      value={pipelineGenre}
                      onChange={(e) => setPipelineGenre(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      placeholder="e.g. Synthwave Pop, Trap, R&B"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mood</label>
                    <input
                      type="text"
                      value={pipelineMood}
                      onChange={(e) => setPipelineMood(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      placeholder="e.g. Euphoric & Nostalgic"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Key / Root</label>
                    <input
                      type="text"
                      value={pipelineKey}
                      onChange={(e) => setPipelineKey(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      placeholder="e.g. C Major, F# Minor"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Theme, Narrative & Conceptual Direction
                  </label>
                  <textarea
                    rows={2}
                    value={pipelineTheme}
                    onChange={(e) => setPipelineTheme(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none resize-none"
                    placeholder="Describe the story, metaphorical imagery, feeling, or narrative arc..."
                  />
                </div>

                {/* Pipeline Stages Map */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Workflow Stages Sequence:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(PRECONFIGURED_PIPELINES.find((p) => p.id === selectedPipelineId)?.stages || []).filter((s) => s.isEnabled).map((stage, idx) => {
                      const agent = agents.find((a) => a.id === stage.agentId);
                      const isCompleted = pipelineResult?.currentStageIndex !== undefined && pipelineResult.currentStageIndex > idx;
                      const isCurrent = pipelineResult?.currentStageIndex === idx && isPipelineRunning;

                      return (
                        <div
                          key={stage.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            isCurrent
                              ? "bg-teal-950 border-teal-400 text-teal-300 ring-2 ring-teal-400/40 animate-pulse"
                              : isCompleted
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                              : "bg-gray-900 border-gray-800 text-gray-400"
                          }`}
                        >
                          <span>{agent?.avatar || "🤖"}</span>
                          <span>{stage.name}</span>
                          {isCompleted && <span>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Run Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-800">
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>⚡ Apollo conducts</span>
                    <span className="text-gray-600">•</span>
                    <span>
                      {(() => {
                        const pipe = PRECONFIGURED_PIPELINES.find((p) => p.id === selectedPipelineId) || PRECONFIGURED_PIPELINES[0];
                        const toolIds = new Set<string>();
                        pipe.stages
                          .filter((s) => s.isEnabled)
                          .forEach((s) => {
                            const ag = agents.find((a) => a.id === s.agentId);
                            (ag?.allowedTools || []).forEach((t) => toolIds.add(t));
                          });
                        return toolIds.size > 0
                          ? `${toolIds.size} agent ${toolIds.size === 1 ? "tool" : "tools"} wired into stage prompts`
                          : "No agent tools assigned";
                      })()}
                    </span>
                  </div>

                  <button
                    onClick={handleStopPipeline}
                    disabled={!isPipelineRunning}
                    className="px-4 py-2.5 bg-red-900/60 hover:bg-red-800/60 border border-red-500/40 text-red-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>⏹ Stop</span>
                  </button>

                  <button
                    onClick={handleRunPipeline}
                    disabled={isPipelineRunning}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-600 to-amber-600 hover:from-teal-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isPipelineRunning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Orchestrating Pipeline ({pipelineResult?.currentStageIndex || 0} / {pipelineResult?.totalStages || 0})...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀 Run Autonomous Pipeline</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pipeline Live Execution Logs & Outputs */}
              {pipelineResult && (
                <div className="bg-gray-950/90 border border-teal-500/30 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      <h4 className="text-sm font-bold text-white">Pipeline Execution Stream & Deliverables</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          pipelineResult.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : pipelineResult.status === "running"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse"
                            : "bg-red-500/20 text-red-300 border border-red-500/40"
                        }`}
                      >
                        {pipelineResult.status}
                      </span>
                    </div>

                    {pipelineResult.status === "completed" && (
                      <button
                        onClick={handleApplyPipelineOutputs}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📥 Apply Results to Active Song</span>
                      </button>
                    )}
                  </div>

                  {pipelineResult.error && (
                    <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-lg text-xs text-red-300">
                      {pipelineResult.error}
                    </div>
                  )}

                  {/* Logs list */}
                  <div className="space-y-4">
                    {pipelineResult.logs.map((log) => (
                      <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{log.agentAvatar}</span>
                            <div>
                              <span className="text-xs font-bold text-teal-300">{log.agentName}</span>
                              <span className="text-gray-500 text-[11px] ml-2">({log.stageName})</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="bg-gray-950 p-3 rounded-lg border border-gray-800/80 text-xs text-gray-200 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                          {log.content}
                        </div>
                        {log.toolCalls && log.toolCalls.length > 0 && (
                          <div className="space-y-1">
                            {log.toolCalls.map((tc, tcIdx) => (
                              <div
                                key={`${log.id}-tool-${tcIdx}`}
                                className="flex items-center gap-2 text-[11px] bg-gray-900/80 border border-gray-700/60 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="text-amber-400">🔧</span>
                                <span className="font-bold text-amber-300 font-mono">tool: {tc.tool}</span>
                                <span className="text-gray-500">→</span>
                                <span className={tc.output?.success ? "text-emerald-400" : "text-red-400"}>
                                  {tc.output?.success ? "executed" : "failed"}: {tc.output?.summary || "no summary"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WRITER'S ROOM LIVE DEBATE & CO-CREATION */}
          {activeTab === "writersRoom" && (
            <div className="space-y-4 flex flex-col h-[65vh]">
              {/* Writer's room header bar */}
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎙️</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Live Multi-Agent Writer's Room</h4>
                    <p className="text-[11px] text-gray-400">Co-write, critique, and brainstorm with your AI songwriting ensemble.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Speak to:</span>
                  <select
                    value={selectedTargetAgentId}
                    onChange={(e) => setSelectedTargetAgentId(e.target.value)}
                    className="bg-gray-900 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.avatar} {ag.name} ({ag.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat Message Feed */}
              <div className="flex-1 bg-gray-950/90 border border-gray-800 rounded-xl p-4 overflow-y-auto space-y-3">
                {writersMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 p-3 rounded-xl border transition-all ${
                        isUser
                          ? "bg-teal-950/30 border-teal-500/30 ml-8"
                          : "bg-gray-900 border-gray-800 mr-8"
                      }`}
                    >
                      <div className="text-2xl select-none pt-0.5">{msg.agentAvatar}</div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isUser ? "text-teal-300" : "text-amber-300"}`}>
                            {msg.agentName}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>

                        {!isUser && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                if (!onApplySongUpdate) {
                                  alert("No active song workspace — open a song/album first, then apply agent output.");
                                  return;
                                }
                                const applied = onApplySongUpdate({
                                  lyricsText: msg.content
                                });
                                if (applied !== false) alert("Applied lyrics to active song!");
                              }}
                              className="text-[10px] bg-gray-800 hover:bg-teal-900 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>📥 Apply as Lyrics</span>
                            </button>
                            <button
                              onClick={() => {
                                if (!onApplySongUpdate) {
                                  alert("No active song workspace — open a song/album first, then attach notes.");
                                  return;
                                }
                                const applied = onApplySongUpdate({
                                  customIdeas: msg.content
                                });
                                if (applied !== false) alert("Attached to song notes!");
                              }}
                              className="text-[10px] bg-gray-800 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>📝 Add to Song Notes</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isAgentReplying && (
                  <div className="flex items-center gap-2 text-xs text-teal-300 italic p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    <span>Specialist agent is composing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChatMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask for lyrics, suggest chords, request an A&R review, or debate melody ideas..."
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isAgentReplying}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Send</span>
                  <span>↗</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AGENT ROSTER & CUSTOM BUILDER */}
          {activeTab === "registry" && (
            <div className="space-y-6">
              {/* Top controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>👥 Agent Roster & Custom Specialists</span>
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
                      {agents.length} Active
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Customize system prompts, assign specialized tools, and build new domain agents.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetAgents}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-700 transition-all cursor-pointer"
                  >
                    Reset Team
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAgentForEdit(null);
                      setFormName("");
                      setFormAvatar("🤖");
                      setFormTitle("");
                      setFormRole("");
                      setFormCategory("lyrics");
                      setFormSystemPrompt("");
                      setFormSkills([]);
                      setFormTools([]);
                      setFormModelId("gemini_2_5_flash");
                      setFormTemp(0.7);
                      setFormTokens(2048);
                      setIsCreatingAgent(true);
                    }}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Create Custom Agent</span>
                  </button>
                </div>
              </div>

              {/* Agent Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${agent.colorTheme.bg} ${agent.colorTheme.border} shadow-sm hover:shadow-md`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-1.5 bg-gray-900/60 rounded-xl border border-gray-700/60 shadow-inner">
                            {agent.avatar}
                          </span>
                          <div>
                            <h5 className="text-sm font-bold text-white">{agent.name}</h5>
                            <span className="text-[11px] text-gray-400 block">{agent.title}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${agent.colorTheme.badge}`}>
                          {agent.category}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{agent.role}</p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1">
                        {agent.skills.map((sk) => {
                          const skillDef = AVAILABLE_SKILLS.find((s) => s.id === sk);
                          return (
                            <span
                              key={sk}
                              className="text-[10px] bg-gray-900/80 text-gray-300 border border-gray-700/60 px-1.5 py-0.5 rounded"
                            >
                              {skillDef?.name || sk}
                            </span>
                          );
                        })}
                      </div>

                      {/* Tools Assigned */}
                      <div className="text-[10px] text-gray-400">
                        <span className="font-bold text-gray-300">Tools: </span>
                        {agent.allowedTools.length} assigned
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-800/80">
                      <span className="text-[10px] text-gray-500">
                        {agent.isBuiltIn ? "Built-in Specialist" : "Custom Agent"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedAgentForEdit(agent);
                            setFormName(agent.name);
                            setFormAvatar(agent.avatar);
                            setFormTitle(agent.title);
                            setFormRole(agent.role);
                            setFormCategory(agent.category);
                            setFormSystemPrompt(agent.systemPrompt);
                            setFormSkills(agent.skills);
                            setFormTools(agent.allowedTools);
                            setFormModelId(agent.preferredModelId);
                            setFormTemp(agent.temperature);
                            setFormTokens(agent.maxTokens);
                            setIsCreatingAgent(true);
                          }}
                          className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-teal-300 border border-teal-500/30 rounded text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        {!agent.isBuiltIn && (
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Agent Form Modal Drawer */}
              {isCreatingAgent && (
                <div className="bg-gray-950 border border-teal-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🤖 {selectedAgentForEdit ? "Edit Specialist Agent" : "Create New Custom Agent"}</span>
                    </h4>
                    <button
                      onClick={() => setIsCreatingAgent(false)}
                      className="text-gray-400 hover:text-white font-bold text-lg"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveCustomAgent} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 block mb-1">Agent Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                          placeholder="e.g. Rhyme Wizard"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 block mb-1">Avatar (Emoji)</label>
                        <input
                          type="text"
                          value={formAvatar}
                          onChange={(e) => setFormAvatar(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                          placeholder="e.g. 🧙‍♂️, 🎧, 🎸"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 block mb-1">Specialist Title</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                          placeholder="e.g. Hook Architect"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">Role Description</label>
                      <input
                        type="text"
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                        placeholder="What this agent specializes in doing..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">System Prompt & Instructions</label>
                      <textarea
                        rows={4}
                        value={formSystemPrompt}
                        onChange={(e) => setFormSystemPrompt(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white font-mono"
                        placeholder="Define character, songwriting rules, constraints, and personality..."
                        required
                      />
                    </div>

                    {/* Tools & Skills selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Assigned Agent Tools</label>
                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-1.5 max-h-36 overflow-y-auto">
                          {AVAILABLE_AGENT_TOOLS.map((tool) => {
                            const isChecked = formTools.includes(tool.id);
                            return (
                              <label key={tool.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormTools([...formTools, tool.id]);
                                    } else {
                                      setFormTools(formTools.filter((t) => t !== tool.id));
                                    }
                                  }}
                                  className="rounded border-gray-700 text-teal-500 focus:ring-0"
                                />
                                <span>{tool.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Assigned Skills</label>
                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-1.5 max-h-36 overflow-y-auto">
                          {AVAILABLE_SKILLS.map((skill) => {
                            const isChecked = formSkills.includes(skill.id);
                            return (
                              <label key={skill.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormSkills([...formSkills, skill.id]);
                                    } else {
                                      setFormSkills(formSkills.filter((s) => s !== skill.id));
                                    }
                                  }}
                                  className="rounded border-gray-700 text-teal-500 focus:ring-0"
                                />
                                <span>{skill.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                      <button
                        type="button"
                        onClick={() => setIsCreatingAgent(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-md"
                      >
                        Save Agent
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LLM MODEL REGISTRY */}
          {activeTab === "llmModels" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🧠 LLM Model Registry & Endpoint Config</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configure Google Gemini, Nous Hermes 3, Ollama local instances, or custom OpenAI-compatible endpoints.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {models.map((mod) => (
                  <div key={mod.id} className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <h5 className="text-sm font-bold text-white">{mod.name}</h5>
                      </div>
                      <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                        {mod.provider}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">{mod.description}</p>

                    <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Model ID:</span>
                        <span className="font-mono text-teal-300">{mod.modelString}</span>
                      </div>
                      {mod.endpointUrl && (
                        <div className="flex items-center justify-between text-gray-400">
                          <span>Endpoint URL:</span>
                          <span className="font-mono text-amber-300 truncate max-w-[200px]">{mod.endpointUrl}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EXTERNAL AGENT EXPORT */}
          {activeTab === "externalExport" && (
            <div className="space-y-6">
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>������ External Agentic System Bridge</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-bold">
                      Hermes / LangGraph / CrewAI
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Connect this app with Nous Hermes 3, LangChain, AutoGen, CrewAI, or any external autonomous agent script using standard tool calling schemas.
                  </p>
                </div>

                {/* Tool Schemas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300">OpenAI / Hermes Standard JSON Tool Schemas:</span>
                    <button
                      onClick={() => {
                        const jsonStr = JSON.stringify(AVAILABLE_AGENT_TOOLS, null, 2);
                        navigator.clipboard.writeText(jsonStr);
                        alert("Tool schemas copied to clipboard!");
                      }}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 cursor-pointer"
                    >
                      📋 Copy Schemas
                    </button>
                  </div>
                  <pre className="bg-gray-900 border border-gray-800 p-3 rounded-lg text-[11px] font-mono text-gray-300 max-h-48 overflow-y-auto">
                    {JSON.stringify(AVAILABLE_AGENT_TOOLS, null, 2)}
                  </pre>
                </div>

                {/* Python / TypeScript Starter */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-amber-300">Hermes 3 / LangGraph Integration Script Example:</span>
                  <pre className="bg-gray-900 border border-gray-800 p-3 rounded-lg text-[11px] font-mono text-gray-300 max-h-48 overflow-y-auto">
{`# Connect your external Hermes 3 Agent to this Songwriting Workspace
import json
import requests

HERMES_SYSTEM_PROMPT = """<|im_start|>system
You are Hermes, the Lead Songwriter Agent.
You collaborate with Apollo (Orchestrator) and Harmonia (Chords).
Execute structured tool calls to generate lyrics, cadence, and hooks.<|im_end|>"""

def generate_track_payload(title, genre, theme):
    # Call your local Ollama / vLLM endpoint
    response = requests.post("http://localhost:11434/v1/chat/completions", json={
        "model": "hermes3:latest",
        "messages": [
            {"role": "system", "content": HERMES_SYSTEM_PROMPT},
            {"role": "user", "content": f"Write a {genre} track titled '{title}' about {theme}"}
        ]
    })
    return response.json()
`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
