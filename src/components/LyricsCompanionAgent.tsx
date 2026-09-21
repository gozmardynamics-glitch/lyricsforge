import React, { useState } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- FLOATING LYRICS COMPANION AGENT COMPONENT ---
const LyricsCompanionAgent = ({
  result,
  onRefine
}: {
  result: AgenticLyricResult | null;
  onRefine: (prompt: string) => Promise<boolean>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'agent'; text: string; time: string }[]>([
    { sender: 'agent', text: "Hello! I'm your Lyric Companion Agent. Ask me to revise any line, change the rhythm, or shift the song key!", time: "Now" }
  ]);

  if (!result) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || isLoading) return;
    const text = inputMsg;
    setInputMsg("");
    setIsLoading(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text, time: now }]);

    const ok = await onRefine(text);

    setMessages(prev => [...prev, {
      sender: 'agent',
      text: ok
        ? `Applied changes for: "${text}"! Check the updated lyrics and production specs.`
        : `Couldn't apply "${text}" — the refinement failed. Please try again.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl shadow-2xl border border-teal-400/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          <span className="text-lg">💬</span>
          <span className="text-xs">Lyrics Companion Agent</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-gray-900 border border-teal-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 via-teal-950 to-gray-900 p-3.5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-teal-400 text-base">🤖</span>
              <div>
                <h5 className="text-xs font-bold text-white">Lyrics Companion Co-Pilot</h5>
                <p className="text-[10px] text-gray-400">Real-time Song & Spec Modifier</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl space-y-1 ${
                  m.sender === 'user' ? "bg-teal-950/80 border border-teal-500/30 text-teal-100 ml-6" : "bg-gray-800 border border-gray-700 text-gray-200 mr-6"
                }`}
              >
                <div className="flex justify-between items-center text-[9px] font-bold opacity-75">
                  <span>{m.sender === 'user' ? 'You' : 'Companion Agent'}</span>
                  <span>{m.time}</span>
                </div>
                <p>{m.text}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-gray-800 bg-gray-950 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="e.g., Make Verse 2 rhyming words richer..."
              disabled={isLoading}
              className="flex-1 bg-gray-900 text-gray-200 px-3 py-2 rounded-xl text-xs border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isLoading}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
// ProductionApiModal moved to src/components/ProductionApiModal.tsx (code-split).
export default LyricsCompanionAgent;
