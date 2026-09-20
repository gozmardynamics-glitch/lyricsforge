import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgentCategory, AgentProfile, AgentToolId } from "../agents/agentTypes";
import { AVAILABLE_AGENT_TOOLS, AVAILABLE_SKILLS } from "../agents/defaultAgents";
import { getStoredLLMModels } from "../agents/llmRegistry";
import { getStoredAgents, saveStoredAgents } from "../agents/orchestratorEngine";

const AGENT_CATEGORIES: AgentCategory[] = ["general", "lyrics", "harmony", "melody", "trends", "critic", "visuals"];

const EMPTY_FORM = {
  name: "",
  avatar: "🤖",
  title: "",
  role: "",
  category: "lyrics" as AgentCategory,
  systemPrompt: "",
  skills: [] as string[],
  allowedTools: [] as AgentToolId[],
  preferredModelId: "gemini_2_5_flash",
  temperature: 0.7,
  maxTokens: 2048
};

const DEFAULT_CUSTOM_THEME = {
  bg: "bg-teal-950/40",
  border: "border-teal-500/50",
  text: "text-teal-300",
  badge: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  glow: "shadow-teal-500/20"
};

interface AgentManagementViewProps {
  onOpenAgentStudio?: () => void;
}

/**
 * Dedicated Agent Management section: browse every agent with description,
 * skills, tools, model settings — and create / edit / delete / reset them.
 */
const AgentManagementView: React.FC<AgentManagementViewProps> = ({ onOpenAgentStudio }) => {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [models, setModels] = useState(getStoredLLMModels());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AgentCategory>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saveError, setSaveError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const reload = useCallback(() => {
    const roster = getStoredAgents();
    setAgents(roster);
    setModels(getStoredLLMModels());
    setSelectedAgentId((prev) => {
      if (prev && roster.some((a) => a.id === prev)) return prev;
      return roster[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const skillName = useCallback((id: string) => AVAILABLE_SKILLS.find((s) => s.id === id)?.name || id, []);
  const skillDef = useCallback((id: string) => AVAILABLE_SKILLS.find((s) => s.id === id), []);
  const toolDef = useCallback((id: string) => AVAILABLE_AGENT_TOOLS.find((t) => t.id === id), []);
  const modelName = useCallback(
    (id: string) => models.find((m) => m.id === id)?.name || id,
    [models]
  );

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (!q) return true;
      return [a.name, a.title, a.role, a.category, a.systemPrompt, ...a.skills, ...a.allowedTools]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [agents, search, categoryFilter]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, preferredModelId: models[0]?.id || EMPTY_FORM.preferredModelId });
    setSaveError("");
    setIsFormOpen(true);
  };

  const openEdit = (agent: AgentProfile) => {
    setEditingId(agent.id);
    setForm({
      name: agent.name,
      avatar: agent.avatar,
      title: agent.title,
      role: agent.role,
      category: agent.category,
      systemPrompt: agent.systemPrompt,
      skills: [...agent.skills],
      allowedTools: [...agent.allowedTools],
      preferredModelId: agent.preferredModelId,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens
    });
    setSaveError("");
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setSaveError("Name and system prompt are required.");
      return;
    }

    if (editingId) {
      const existing = agents.find((a) => a.id === editingId);
      if (!existing) {
        setSaveError("Agent not found.");
        return;
      }
      const edited: AgentProfile = {
        ...existing,
        name: form.name.trim(),
        avatar: form.avatar.trim() || "🤖",
        title: form.title.trim() || "Specialist",
        role: form.role.trim(),
        category: form.category,
        systemPrompt: form.systemPrompt.trim(),
        skills: form.skills,
        allowedTools: form.allowedTools,
        preferredModelId: form.preferredModelId,
        temperature: form.temperature,
        maxTokens: form.maxTokens
      };
      const updated = agents.map((a) => (a.id === editingId ? edited : a));
      setAgents(updated);
      saveStoredAgents(updated);
      setSelectedAgentId(editingId);
      setStatusMsg(`Updated ${edited.name}`);
    } else {
      const newAgent: AgentProfile = {
        id: `agent_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: form.name.trim(),
        avatar: form.avatar.trim() || "🤖",
        title: form.title.trim() || "Custom Specialist",
        role: form.role.trim() || "Creative assistant",
        category: form.category,
        systemPrompt: form.systemPrompt.trim(),
        skills: form.skills,
        allowedTools: form.allowedTools,
        preferredModelId: form.preferredModelId,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        isBuiltIn: false,
        colorTheme: DEFAULT_CUSTOM_THEME
      };
      const updated = [...agents, newAgent];
      setAgents(updated);
      saveStoredAgents(updated);
      setSelectedAgentId(newAgent.id);
      setStatusMsg(`Created ${newAgent.name}`);
    }
    setIsFormOpen(false);
    setEditingId(null);
    setSaveError("");
  };

  const handleDelete = (agent: AgentProfile) => {
    if (agent.isBuiltIn) return;
    if (!confirm(`Delete custom agent "${agent.name}"? This cannot be undone.`)) return;
    const updated = agents.filter((a) => a.id !== agent.id);
    setAgents(updated);
    saveStoredAgents(updated);
    if (selectedAgentId === agent.id) setSelectedAgentId(updated[0]?.id ?? null);
    setStatusMsg(`Deleted ${agent.name}`);
  };

  const handleReset = () => {
    if (!confirm("Reset agent roster to the built-in team? Custom agents will be removed.")) return;
    try {
      localStorage.removeItem("lyricist_pro_agents_registry_v1");
    } catch { /* ignore */ }
    reload();
    setStatusMsg("Roster reset to built-in agents");
  };

  const toggleSkill = (id: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(id) ? f.skills.filter((s) => s !== id) : [...f.skills, id]
    }));
  };

  const toggleTool = (id: AgentToolId) => {
    setForm((f) => ({
      ...f,
      allowedTools: f.allowedTools.includes(id)
        ? f.allowedTools.filter((t) => t !== id)
        : [...f.allowedTools, id]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gray-900/80 border border-teal-500/30 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>👥 Agent Management</span>
              <span className="text-[11px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {agents.length} agents
              </span>
            </h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
              Browse every songwriting agent — role, system prompt, skills, tools, and model settings.
              Edit built-in specialists or create custom agents used by Pipelines and Writer&apos;s Room.
            </p>
            {statusMsg && (
              <p className="text-xs text-emerald-300 mt-2 font-semibold">{statusMsg}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents, skills, tools…"
              className="bg-gray-950 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 w-48 focus:border-teal-400 focus:outline-none"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-gray-950 border border-gray-700 text-teal-300 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="all">All categories</option>
              {AGENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer"
            >
              Reset Team
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer active:scale-95"
            >
              + Create Agent
            </button>
            {onOpenAgentStudio && (
              <button
                onClick={onOpenAgentStudio}
                className="px-3 py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 cursor-pointer"
                title="Open pipelines, Writer's Room, and LLM registry"
              >
                ⚡ Agentic Studio
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Agent list */}
        <div className="xl:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Roster ({filteredAgents.length})
          </h3>
          {filteredAgents.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-sm text-gray-500">
              No agents match your filters.
            </div>
          )}
          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {filteredAgents.map((agent) => {
              const active = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? `${agent.colorTheme.bg} ${agent.colorTheme.border} shadow-lg`
                      : "bg-gray-900/80 border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 bg-gray-950/60 rounded-xl border border-gray-700/60">
                      {agent.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{agent.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${agent.colorTheme.badge}`}>
                          {agent.category}
                        </span>
                        {agent.isBuiltIn && (
                          <span className="text-[10px] text-gray-500">built-in</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{agent.title}</p>
                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-1 leading-snug">{agent.role}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.skills.slice(0, 3).map((sk) => (
                          <span key={sk} className="text-[9px] bg-gray-950/80 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">
                            {skillName(sk)}
                          </span>
                        ))}
                        {agent.skills.length > 3 && (
                          <span className="text-[9px] text-gray-500">+{agent.skills.length - 3} skills</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1.5">
                        {agent.allowedTools.length} tools · {modelName(agent.preferredModelId)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-7">
          {isFormOpen ? (
            <form onSubmit={handleSave} className="bg-gray-950 border border-teal-500/50 rounded-2xl p-5 space-y-4 sticky top-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  {editingId ? "Edit Agent" : "Create Custom Agent"}
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingId(null); }}
                  className="text-gray-400 hover:text-white text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {saveError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">{saveError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="e.g. Rhyme Wizard"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Avatar</label>
                  <input
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="🎧"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="Hook Architect"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as AgentCategory })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {AGENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Role description</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="What this agent specializes in"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">System prompt *</label>
                <textarea
                  rows={6}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white font-mono leading-relaxed"
                  placeholder="Character, songwriting rules, constraints, personality…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Preferred LLM</label>
                  <select
                    value={form.preferredModelId}
                    onChange={(e) => setForm({ ...form, preferredModelId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">
                    Temperature ({form.temperature.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Max tokens</label>
                  <input
                    type="number"
                    min={128}
                    max={8192}
                    step={128}
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value, 10) || 2048 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Tools</label>
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2 max-h-48 overflow-y-auto">
                    {AVAILABLE_AGENT_TOOLS.map((tool) => (
                      <label key={tool.id} className="flex items-start gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allowedTools.includes(tool.id)}
                          onChange={() => toggleTool(tool.id)}
                          className="mt-0.5 rounded border-gray-700 text-teal-500"
                        />
                        <span>
                          <span className="font-semibold text-gray-200">{tool.name}</span>
                          <span className="block text-[10px] text-gray-500 leading-snug">{tool.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Skills</label>
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2 max-h-48 overflow-y-auto">
                    {AVAILABLE_SKILLS.map((skill) => (
                      <label key={skill.id} className="flex items-start gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.skills.includes(skill.id)}
                          onChange={() => toggleSkill(skill.id)}
                          className="mt-0.5 rounded border-gray-700 text-teal-500"
                        />
                        <span>
                          <span className="font-semibold text-gray-200">{skill.name}</span>
                          <span className="block text-[10px] text-gray-500 leading-snug">{skill.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingId(null); }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer"
                >
                  {editingId ? "Save Changes" : "Create Agent"}
                </button>
              </div>
            </form>
          ) : selectedAgent ? (
            <div className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${selectedAgent.colorTheme.bg} ${selectedAgent.colorTheme.border} sticky top-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-4xl p-3 bg-gray-950/60 rounded-2xl border border-gray-700/60">
                    {selectedAgent.avatar}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedAgent.name}</h3>
                    <p className="text-sm text-gray-300">{selectedAgent.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${selectedAgent.colorTheme.badge}`}>
                        {selectedAgent.category}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {selectedAgent.isBuiltIn ? "Built-in specialist" : "Custom agent"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{selectedAgent.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => openEdit(selectedAgent)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  {!selectedAgent.isBuiltIn && (
                    <button
                      onClick={() => handleDelete(selectedAgent)}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</h4>
                <p className="text-sm text-gray-200 leading-relaxed">{selectedAgent.role || "—"}</p>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">System prompt</h4>
                <pre className="text-[11px] text-gray-300 bg-gray-950/80 border border-gray-800 rounded-xl p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {selectedAgent.systemPrompt}
                </pre>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Skills ({selectedAgent.skills.length})
                </h4>
                {selectedAgent.skills.length === 0 ? (
                  <p className="text-xs text-gray-500">No skills assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.skills.map((sk) => {
                      const def = skillDef(sk);
                      return (
                        <div key={sk} className="bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2">
                          <div className="text-xs font-bold text-white">{def?.name || sk}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{def?.description || "Custom skill id"}</div>
                          {def && (
                            <div className="text-[10px] text-gray-500 mt-1 font-mono">{def.id} · {def.category}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Tools ({selectedAgent.allowedTools.length})
                </h4>
                {selectedAgent.allowedTools.length === 0 ? (
                  <p className="text-xs text-gray-500">No tools assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.allowedTools.map((tid) => {
                      const def = toolDef(tid);
                      return (
                        <div key={tid} className="bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2">
                          <div className="text-xs font-bold text-white">{def?.name || tid}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{def?.description || "Unknown tool"}</div>
                          {def && (
                            <div className="text-[10px] text-gray-500 mt-1 font-mono">
                              {def.id}
                              {def.parameters?.length > 0 && (
                                <span> · params: {def.parameters.map((p) => p.name + (p.required ? "*" : "")).join(", ")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-800/80">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Model</div>
                  <div className="text-xs text-teal-300 font-semibold mt-0.5">
                    {modelName(selectedAgent.preferredModelId)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Temperature</div>
                  <div className="text-xs text-white font-mono mt-0.5">{selectedAgent.temperature}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Max tokens</div>
                  <div className="text-xs text-white font-mono mt-0.5">{selectedAgent.maxTokens}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-sm text-gray-500">
              Select an agent from the roster to view details.
            </div>
          )}
        </div>
      </div>

      {/* Skill & tool catalogs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Skill Catalog</h3>
          <div className="space-y-2">
            {AVAILABLE_SKILLS.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 text-xs border-b border-gray-800/80 pb-2 last:border-0">
                <div>
                  <div className="font-bold text-gray-200">{s.name}</div>
                  <div className="text-gray-500">{s.description}</div>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">{s.category}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Tool Catalog</h3>
          <div className="space-y-2">
            {AVAILABLE_AGENT_TOOLS.map((t) => (
              <div key={t.id} className="text-xs border-b border-gray-800/80 pb-2 last:border-0">
                <div className="font-bold text-gray-200">{t.name}</div>
                <div className="text-gray-500">{t.description}</div>
                <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                  {t.id}
                  {t.parameters?.length > 0 && ` · ${t.parameters.map((p) => p.name).join(", ")}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagementView;
