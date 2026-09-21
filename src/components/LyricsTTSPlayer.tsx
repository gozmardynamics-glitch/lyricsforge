import React, { useState, useEffect, useRef, useMemo } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- TEXT-TO-SPEECH (TTS) SYNTHESIS NARRATION PLAYER ---
interface LyricsTTSPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  lyricsText: string;
  songTitle?: string;
}

export const LyricsTTSPlayer: React.FC<LyricsTTSPlayerProps> = ({
  isOpen,
  onClose,
  lyricsText,
  songTitle = "Active Lyrics Draft"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0); // 0.6x to 1.8x
  const [pitch, setPitch] = useState(1.0); // 0.7x to 1.3x
  const [volume, setVolume] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);

  // Split lyrics into non-empty spoken lines
  const lines = React.useMemo(() => {
    return (lyricsText || "")
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }, [lyricsText]);

  // Load browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const avail = window.speechSynthesis.getVoices();
      if (avail && avail.length > 0) {
        setVoices(avail);
        // Default to English voice if available
        const enIdx = avail.findIndex(v => v.lang.startsWith('en'));
        if (enIdx >= 0) setSelectedVoiceIndex(enIdx);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop playback when modal closes
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
    }
  }, [isOpen]);

  const speakLinesSequentially = (startIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    if (startIndex >= lines.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      return;
    }

    const currentLine = lines[startIndex];
    // Filter out purely decorative bracket tags for cleaner vocalization
    const vocalText = currentLine.replace(/^\[.*?\]/, '').trim() || currentLine;

    const utterance = new SpeechSynthesisUtterance(vocalText);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentLineIndex(startIndex);
    };

    utterance.onend = () => {
      if (startIndex + 1 < lines.length) {
        speakLinesSequentially(startIndex + 1);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentLineIndex(-1);
      }
    };

    utterance.onerror = (e) => {
      console.warn("TTS Error:", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (isPaused && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    const startAt = currentLineIndex >= 0 ? currentLineIndex : 0;
    speakLinesSequentially(startAt);
  };

  const handlePause = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
    }
  };

  const handleReplay = () => {
    handleStop();
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    replayTimerRef.current = setTimeout(() => {
      speakLinesSequentially(0);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-900 border border-teal-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-950 border border-teal-500/40 flex items-center justify-center text-teal-300 text-lg shadow-sm">
              🔊
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                Audio Cadence & Flow Studio
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">Text-to-Speech Lyrics Narration</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Info & Song Title */}
        <div className="bg-gray-950/80 p-3 rounded-2xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Target Track</span>
            <h4 className="text-sm font-bold text-teal-300">{songTitle}</h4>
          </div>
          <span className="text-xs font-mono text-gray-400">{lines.length} lines to vocalize</span>
        </div>

        {/* Live Scansion Lyric Teleprompter / Highlighting */}
        <div className="flex-1 max-h-56 overflow-y-auto bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-1.5 pr-2">
          {lines.length > 0 ? (
            lines.map((line, idx) => {
              const isCurrent = currentLineIndex === idx;
              const isHeader = line.startsWith('[') || line.startsWith('#');
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isPlaying) {
                      speakLinesSequentially(idx);
                    }
                  }}
                  className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-teal-600/30 text-teal-200 border border-teal-400/60 font-bold shadow-md scale-[1.01]"
                      : isHeader
                      ? "text-teal-400 font-bold pt-2 opacity-90"
                      : "text-gray-300 hover:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{line}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-teal-300 bg-teal-950 px-2 py-0.5 rounded animate-pulse">
                        ▶ SPEAKING
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-xs italic text-center py-6">No lyric lines found to narrate.</p>
          )}
        </div>

        {/* Cadence Voice Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-950/80 p-3.5 rounded-2xl border border-gray-800 text-xs">
          {/* Voice Selector */}
          <div>
            <label className="block text-gray-400 font-bold mb-1">Voice Character</label>
            <select
              value={selectedVoiceIndex}
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
              className="w-full bg-gray-900 text-white p-2 rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 text-xs"
            >
              {voices.map((v, i) => (
                <option key={i} value={i}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speed / Rate */}
          <div>
            <div className="flex items-center justify-between text-gray-400 font-bold mb-1">
              <span>Pacing / Speed</span>
              <span className="text-teal-300 font-mono">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-teal-400"
            />
          </div>

          {/* Pitch */}
          <div>
            <div className="flex items-center justify-between text-gray-400 font-bold mb-1">
              <span>Pitch / Tone</span>
              <span className="text-teal-300 font-mono">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-teal-400"
            />
          </div>
        </div>

        {/* Playback Controls Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReplay}
              disabled={lines.length === 0}
              className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
              title="Restart from Line 1"
            >
              <span>🔄 Restart</span>
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              className="px-3.5 py-2.5 bg-gray-800 hover:bg-red-900/60 text-gray-300 hover:text-red-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
               Stop
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer active:scale-95"
              >
                 Pause Narration
              </button>
            ) : (
              <button
                onClick={handlePlay}
                disabled={lines.length === 0}
                className="px-7 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>▶ {isPaused ? "Resume Narration" : "Hear Lyrics (TTS)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default LyricsTTSPlayer;
