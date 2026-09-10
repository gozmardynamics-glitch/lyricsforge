import React, { useState } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import { generateLyricsPdf } from "./generateLyricsPdf";
import LyricEnhancerModal from "./LyricEnhancerModal";
import ChordProgressionModal from "./ChordProgressionModal";
import SentimentAnalysisOverlay from "./SentimentAnalysisOverlay";
import LyricsTTSPlayer from "./LyricsTTSPlayer";
import ThematicHookGeneratorModal from "./ThematicHookGeneratorModal";
import MelodyGuidanceModal from "./MelodyGuidanceModal";
import LyricSheetExportModal from "./LyricSheetExportModal";
import AIAlbumArtworkGeneratorModal from "./AIAlbumArtworkGeneratorModal";

// --- PERSISTENT LYRICS VERSION HISTORY SIDEBAR ---
interface LyricsVersionHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  versionHistory: LyricDraftVersion[];
  onRevert: (lyricsText: string, title?: string) => void;
  onTakeSnapshot?: () => void;
  onDeleteVersion: (id: string) => void;
  onClearHistory: () => void;
  currentLyrics?: string;
}

export const LyricsVersionHistorySidebar: React.FC<LyricsVersionHistorySidebarProps> = ({
  isOpen,
  onClose,
  versionHistory,
  onRevert,
  onTakeSnapshot,
  onDeleteVersion,
  onClearHistory,
  currentLyrics = ""
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<LyricDraftVersion | null>(null);
  const [diffModeVersionId, setDiffModeVersionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredHistory = versionHistory.filter(v => {
    const q = searchTerm.toLowerCase();
    return (
      (v.title && v.title.toLowerCase().includes(q)) ||
      (v.tag && v.tag.toLowerCase().includes(q)) ||
      (v.lyricsText && v.lyricsText.toLowerCase().includes(q))
    );
  });

  const handleCopy = async (item: LyricDraftVersion) => {
    try {
      await navigator.clipboard.writeText(item.lyricsText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleExportSinglePdf = (item: LyricDraftVersion) => {
    generateLyricsPdf({
      title: item.title,
      genre: item.genre,
      mood: item.mood,
      lyricsText: item.lyricsText
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md sm:max-w-lg bg-gray-950 border-l border-teal-500/40 h-full flex flex-col shadow-2xl text-white">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-950 border border-teal-500/40 flex items-center justify-center text-teal-300 text-lg shadow-sm">
              ðŸ•’
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                Draft Time Machine
              </span>
              <h3 className="text-base font-black text-white mt-0.5">Lyrics Version History</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTakeSnapshot && (
              <button
                onClick={onTakeSnapshot}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                title="Freeze and save current lyric state"
              >
                ðŸ“¸ Snapshot
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 cursor-pointer"
            >
              âœ•
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-gray-800 space-y-2 bg-gray-900/40">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search versions by lyric lines, tags, or song title..."
              className="w-full bg-gray-900 text-white text-xs p-3 rounded-xl border border-gray-700 pl-8 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <span className="absolute left-2.5 top-3 text-gray-500 text-xs">ðŸ”</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-3 text-gray-400 hover:text-white text-xs"
              >
                âœ•
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>{filteredHistory.length} saved iteration(s)</span>
            {versionHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your lyrics version history?")) {
                    onClearHistory();
                  }
                }}
                className="text-red-400 hover:text-red-300 text-[11px] underline cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Version Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, idx) => {
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateDay = new Date(item.timestamp).toLocaleDateString();
              const isSelected = selectedVersion?.id === item.id;
              const isDiffMode = diffModeVersionId === item.id;

              return (
                <div
                  key={item.id || idx}
                  className={`bg-gray-900/90 border rounded-2xl p-4 transition-all space-y-3 ${
                    isSelected
                      ? "border-teal-400 bg-gray-900 ring-1 ring-teal-400/40"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Version Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                        {item.tag || `Draft ${idx + 1}`}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                        {item.title || "Untitled Draft"}
                      </h4>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      {dateStr} â€¢ {dateDay}
                    </div>
                  </div>

                  {/* Metrics Badge */}
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                    <span className="bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      ðŸ“ {item.wordCount || item.lyricsText.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span className="bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      ðŸŽ¼ {item.lineCount || item.lyricsText.split('\n').filter(Boolean).length} lines
                    </span>
                  </div>

                  {/* Lyrics Preview Snippet */}
                  <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800/80 text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
                    {item.lyricsText.slice(0, 240)}
                    {item.lyricsText.length > 240 && "..."}
                  </div>

                  {/* Diff Comparison View if toggled */}
                  {isDiffMode && currentLyrics && (
                    <div className="p-3 bg-gray-950 rounded-xl border border-indigo-500/40 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase text-indigo-400">
                        Diff Comparison (Vs Current Editor)
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {item.lyricsText.split('\n').map((line, lIdx) => {
                          const existsInCurrent = currentLyrics.includes(line);
                          return (
                            <div
                              key={lIdx}
                              className={`p-1 rounded ${
                                existsInCurrent ? "text-gray-300" : "bg-emerald-950/60 text-emerald-300 font-semibold"
                              }`}
                            >
                              {existsInCurrent ? "  " : "+ "}{line}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(item)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        {copiedId === item.id ? "Copied!" : "ðŸ“‹ Copy"}
                      </button>
                      <button
                        onClick={() => handleExportSinglePdf(item)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-teal-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Download as PDF Sheet"
                      >
                        ðŸ“„ PDF
                      </button>
                      <button
                        onClick={() => setDiffModeVersionId(isDiffMode ? null : item.id)}
                        className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Compare Diff with Current"
                      >
                        {isDiffMode ? "Hide Diff" : "ðŸ”€ Diff"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onDeleteVersion(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 text-xs rounded-lg hover:bg-gray-800 cursor-pointer"
                        title="Delete snapshot"
                      >
                        ðŸ—‘ï¸
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Revert active lyrics to "${item.title || item.tag}"?`)) {
                            onRevert(item.lyricsText, item.title);
                            onClose();
                          }
                        }}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <span>âª 1-Click Revert</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-gray-500 space-y-3 border border-dashed border-gray-800 rounded-3xl p-6">
              <span className="text-4xl">ðŸ•’</span>
              <h5 className="font-bold text-gray-300 text-sm">No History Snapshots Yet</h5>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Snapshots are automatically recorded when you generate, edit, or harmonize lyrics. You can also click <strong>ðŸ“¸ Snapshot</strong> anytime!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex items-center justify-between text-xs text-gray-400">
          <span>ðŸ’¡ 1-Click revert instantly restores past drafts into your active studio editor.</span>
        </div>
      </div>
    </div>
  );
};


// LyricsDisplay moved to src/components/LyricsDisplay.tsx

// =========================================================================
export default LyricsVersionHistorySidebar;
