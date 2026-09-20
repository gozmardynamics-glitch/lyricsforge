import React, { useState, useEffect, useRef, useCallback } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import { generateLyricsPdf } from "./generateLyricsPdf";
import AIAlbumArtworkGeneratorModal from "./AIAlbumArtworkGeneratorModal";
import SentimentAnalysisOverlay from "./SentimentAnalysisOverlay";
import LyricsTTSPlayer from "./LyricsTTSPlayer";
import LyricEnhancerModal from "./LyricEnhancerModal";
import ChordProgressionModal from "./ChordProgressionModal";
import ThematicHookGeneratorModal from "./ThematicHookGeneratorModal";
import MelodyGuidanceModal from "./MelodyGuidanceModal";
import LyricSheetExportModal from "./LyricSheetExportModal";

const LyricsDisplay = ({
  lyrics,
  songContext
}: {
  lyrics: string[][];
  songContext?: { title?: string; genre?: string; mood?: string; language?: string };
}) => {
  const [enhancerLine, setEnhancerLine] = useState("");
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [exportVersionIdx, setExportVersionIdx] = useState<number | null>(null);
  const [isChordsOpen, setIsChordsOpen] = useState(false);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [isHookModalOpen, setIsHookModalOpen] = useState(false);
  const [isMelodyModalOpen, setIsMelodyModalOpen] = useState(false);
  const [ttsState, setTtsState] = useState<{ isOpen: boolean; lyrics: string; title: string }>({
    isOpen: false,
    lyrics: "",
    title: ""
  });
  const [savedSnapshotVersion, setSavedSnapshotVersion] = useState<number | null>(null);

  const handleSaveSnapshot = (text: string, versionNum: number) => {
    try {
      const historyRaw = localStorage.getItem("lyricist_version_history_v1");
      const existing: LyricDraftVersion[] = historyRaw ? JSON.parse(historyRaw) : [];
      const newVersion: LyricDraftVersion = {
        id: "ver-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        title: songContext?.title ? `${songContext.title} (V${versionNum})` : `Draft V${versionNum}`,
        lyricsText: text,
        genre: songContext?.genre,
        mood: songContext?.mood,
        timestamp: Date.now(),
        tag: `V${versionNum} Snapshot`,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        lineCount: text.split('\n').filter(Boolean).length,
        charCount: text.length
      };
      const updated = [newVersion, ...existing].slice(0, 50);
      localStorage.setItem("lyricist_version_history_v1", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("lyrics_history_updated", { detail: updated }));
      setSavedSnapshotVersion(versionNum);
      setTimeout(() => setSavedSnapshotVersion(null), 2500);
    } catch (e) {
      console.error("Failed to save snapshot", e);
    }
  };

  const handleQuickExportPdf = (versionIdx: number) => {
    const text = lyrics[versionIdx]?.join('\n') || "";
    generateLyricsPdf({
      title: songContext?.title ? `${songContext.title} (V${versionIdx + 1})` : `Lyric Sheet V${versionIdx + 1}`,
      genre: songContext?.genre || "Pop",
      mood: songContext?.mood || "Dynamic",
      lyricsText: text
    });
  };

  return (
    <div className="mt-6 p-4 bg-gray-900 rounded-xl border border-gray-700/80 animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
        <div>
          <h5 className="font-bold text-lg text-teal-300 flex items-center gap-2">
            <span>Generated Lyric Versions</span>
            <span className="text-xs font-normal text-gray-400">{lyrics?.length || 0} AI Variation{(lyrics?.length || 0) === 1 ? "" : "s"}</span>
          </h5>
          <p className="text-[11px] text-gray-400">
            ðŸ’¡ Click <strong>ðŸ”Š TTS Flow</strong> to hear narration, <strong>ðŸŽ¨ AI Artwork</strong> for custom album cover, or <strong>ðŸ’¡ Thematic Hook</strong> for opening lines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsArtworkModalOpen(true)}
            className="px-3 py-1.5 bg-pink-950/90 hover:bg-pink-900 text-pink-300 border border-pink-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Generate custom AI vinyl album cover artwork"
          >
            <span>ðŸŽ¨ AI Artwork</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHookModalOpen(true)}
            className="px-3 py-1.5 bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Generate thematic hook / opening line to beat writer's block"
          >
            <span>ðŸ’¡ Thematic Hook</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMelodyModalOpen(true)}
            className="px-3 py-1.5 bg-teal-950/90 hover:bg-teal-900 text-teal-300 border border-teal-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Open Melody & Scale Motif Guide (contours, piano roll & AI vocal architect)"
          >
            <span>ðŸŽµ Melody & Motifs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const fullText = lyrics[0]?.join('\n') || "";
              setTtsState({
                isOpen: true,
                lyrics: fullText,
                title: songContext?.title ? `${songContext.title} (V1)` : "Lyric Draft V1"
              });
            }}
            className="px-3 py-1.5 bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Hear vocal narration of current lyrics"
          >
            <span>ðŸ”Š Hear Cadence (TTS)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChordsOpen(true)}
            className="px-3 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Suggest chord progressions for this genre"
          >
            <span>ðŸŽ¹ Chords</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstLine = lyrics[0]?.[0] || "";
              setEnhancerLine(firstLine);
              setIsEnhancerOpen(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>âœ¨ 5-Type AI Line Enhancer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lyrics.map((version, index) => {
          const fullVersionText = version.join('\n');
          return (
            <div key={index} className="bg-gray-800/90 p-4 rounded-xl border border-gray-700 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-gray-900 text-teal-400 px-2 py-0.5 rounded border border-gray-700">
                      V{index + 1}
                    </span>
                    <h6 className="font-semibold text-white text-sm">Version {index + 1}</h6>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickExportPdf(index)}
                      className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-500/40 transition-all cursor-pointer flex items-center gap-1"
                      title="Direct PDF Lead Sheet Download"
                    >
                      <span>ðŸ“„ PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportVersionIdx(index)}
                      className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 transition-all cursor-pointer"
                      title="Open Full Print & Lead Sheet Studio"
                    >
                      ðŸŽ¼ Sheet
                    </button>
                    <CopyButton textToCopy={fullVersionText} label="Copy" />
                  </div>
                </div>

                {/* Quick Audio & History bar */}
                <div className="flex items-center justify-between gap-1.5 bg-gray-900/90 p-1.5 rounded-xl border border-gray-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      setTtsState({
                        isOpen: true,
                        lyrics: fullVersionText,
                        title: songContext?.title ? `${songContext.title} (V${index + 1})` : `Lyric Draft V${index + 1}`
                      });
                    }}
                    className="flex-1 py-1 px-2 bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-500/30 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="Vocalize this version line-by-line"
                  >
                    <span>ðŸ”Š Hear TTS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSnapshot(fullVersionText, index + 1)}
                    className="flex-1 py-1 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 border border-gray-700"
                    title="Save this draft to the Version History time machine"
                  >
                    <span>{savedSnapshotVersion === index + 1 ? "âœ“ Saved!" : "ðŸ“¸ Snapshot"}</span>
                  </button>
                </div>

                {/* Sentiment Analysis Emotional Meter */}
                <SentimentAnalysisOverlay lyricsText={fullVersionText} isCollapsedDefault={index !== 0} />

                <div className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto pr-1">
                  {parseLyricsMarkdown(fullVersionText)}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsArtworkModalOpen(true)}
                  className="py-2 px-2.5 bg-pink-950/60 hover:bg-pink-900 text-pink-300 border border-pink-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="Generate Album Art for this track"
                >
                  <span>ðŸŽ¨ Cover</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChordsOpen(true)}
                  className="py-2 px-2.5 bg-gray-900 hover:bg-gray-700 text-indigo-300 hover:text-white border border-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="View chord suggestions for this version"
                >
                  <span>ðŸŽ¹ Chords</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sampleLine = version.find(l => l && !l.startsWith('[') && !l.startsWith('#')) || version[0] || "";
                    setEnhancerLine(sampleLine);
                    setIsEnhancerOpen(true);
                  }}
                  className="flex-1 py-2 bg-gray-900/90 hover:bg-gray-700/80 text-teal-300 hover:text-white border border-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>âœ¨ Enhance V{index + 1}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TTS Narration Player Modal */}
      {ttsState.isOpen && (
        <LyricsTTSPlayer
          isOpen={ttsState.isOpen}
          onClose={() => setTtsState(prev => ({ ...prev, isOpen: false }))}
          lyricsText={ttsState.lyrics}
          songTitle={ttsState.title}
        />
      )}

      {/* Lyric Line Enhancer Modal */}
      {isEnhancerOpen && (
        <LyricEnhancerModal
          isOpen={isEnhancerOpen}
          onClose={() => setIsEnhancerOpen(false)}
          initialLine={enhancerLine}
          songContext={songContext}
        />
      )}

      {/* Chord Progression Suggester Modal */}
      {isChordsOpen && (
        <ChordProgressionModal
          isOpen={isChordsOpen}
          onClose={() => setIsChordsOpen(false)}
          genre={songContext?.genre || "Pop"}
          songTitle={songContext?.title}
          mood={songContext?.mood}
        />
      )}

      {/* AI Album Artwork Generator Modal */}
      {isArtworkModalOpen && (
        <React.Suspense fallback={null}>
          <AIAlbumArtworkGeneratorModal
            isOpen={isArtworkModalOpen}
            onClose={() => setIsArtworkModalOpen(false)}
            songTitle={songContext?.title || "Studio Single"}
            genre={songContext?.genre || "Pop"}
            mood={songContext?.mood || "Reflective"}
            lyricsSnippet={lyrics[0]?.slice(0, 4).join('\n') || ""}
          />
        </React.Suspense>
      )}

      {/* Thematic Hook Generator Modal */}
      {isHookModalOpen && (
        <ThematicHookGeneratorModal
          isOpen={isHookModalOpen}
          onClose={() => setIsHookModalOpen(false)}
          initialGenre={songContext?.genre || "Pop"}
          initialMood={songContext?.mood || "Euphoric"}
          songTitle={songContext?.title}
        />
      )}

      {/* Melody & Scale Motif Guidance Modal */}
      {isMelodyModalOpen && (
        <MelodyGuidanceModal
          isOpen={isMelodyModalOpen}
          onClose={() => setIsMelodyModalOpen(false)}
          initialGenre={songContext?.genre || "Pop"}
          initialMood={songContext?.mood || "Euphoric"}
          songTitle={songContext?.title}
          initialLyrics={lyrics[0]?.join('\n') || ""}
        />
      )}

      {/* Lyric Lead Sheet Export Modal */}
      {exportVersionIdx !== null && (
        <React.Suspense fallback={null}>
          <LyricSheetExportModal
            isOpen={exportVersionIdx !== null}
            onClose={() => setExportVersionIdx(null)}
          song={{
            id: `v-${exportVersionIdx}`,
            title: songContext?.title ? `${songContext.title} (V${exportVersionIdx + 1})` : `Version ${exportVersionIdx + 1}`,
            genre: songContext?.genre || "Pop",
            mood: songContext?.mood || "Euphoric",
            language: songContext?.language || "English",
            lyrics: [lyrics[exportVersionIdx]]
          } as any}
          />
        </React.Suspense>
      )}
    </div>
  );
};
export default LyricsDisplay;
