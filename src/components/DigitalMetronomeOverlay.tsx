import React, { useState, useEffect, useRef, useCallback } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- DIGITAL METRONOME OVERLAY WITH ADJUSTABLE BPM ---
interface DigitalMetronomeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialBpm?: number;
}

const GENRE_TEMPO_PRESETS = [
  { label: 'Ballad / Soul', bpm: 72 },
  { label: 'Lo-Fi / R&B', bpm: 85 },
  { label: 'Boom-Bap / Hip-Hop', bpm: 92 },
  { label: 'Pop / Afrobeats', bpm: 106 },
  { label: 'Rock / Funk', bpm: 118 },
  { label: 'House / Dance', bpm: 126 },
  { label: 'Trap / Drill', bpm: 142 },
  { label: 'Drum & Bass', bpm: 174 }
];

export const DigitalMetronomeOverlay: React.FC<DigitalMetronomeOverlayProps> = ({
  isOpen,
  onClose,
  initialBpm = 120
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatsPerBar, setBeatsPerBar] = useState<number>(4); // 4/4, 3/4, 6/8, 2/4
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  // Audio Context reference
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const currentBeatRef = useRef<number>(0);

  const playClick = useCallback((isAccent: boolean) => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Higher frequency for Beat 1 accent
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1050 : 750, ctx.currentTime);

        // Crisp percussion envelope
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isAccent ? 0.08 : 0.05));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn("Metronome AudioContext error", e);
    }
  }, [isMuted, volume]);

  // Tick execution
  const handleTick = useCallback(() => {
    const nextBeat = (currentBeatRef.current + 1) % beatsPerBar;
    currentBeatRef.current = nextBeat;
    setCurrentBeat(nextBeat);
    playClick(nextBeat === 0);
  }, [beatsPerBar, playClick]);

  // Metronome timer management
  useEffect(() => {
    if (isPlaying) {
      currentBeatRef.current = 0;
      setCurrentBeat(0);
      playClick(true);
      const intervalMs = (60 / bpm) * 1000;
      intervalIdRef.current = window.setInterval(handleTick, intervalMs);
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      currentBeatRef.current = 0;
      setCurrentBeat(0);
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isPlaying, bpm, handleTick, playClick]);

  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;

    // Reset if last tap was more than 2.5 seconds ago
    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      tapTimesRef.current = [now];
      return;
    }

    times.push(now);
    if (times.length > 5) {
      times.shift();
    }

    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.min(Math.max(calculatedBpm, 40), 240);
      setBpm(clampedBpm);
    }
  };

  const handleAdjustBpm = (delta: number) => {
    setBpm(prev => Math.min(Math.max(prev + delta, 30), 260));
  };

  if (!isOpen) return null;

  // Minimized floating bubble
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 border border-teal-500/60 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in text-white">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
            isPlaying ? "bg-teal-500 text-gray-950 shadow-lg animate-pulse" : "bg-gray-800 text-teal-300 hover:bg-gray-700"
          }`}
          title={isPlaying ? "Pause Metronome" : "Start Metronome"}
        >
          {isPlaying ? "â¸" : "â–¶"}
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm text-teal-300">{bpm} BPM</span>
            <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-bold">{beatsPerBar}/4</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Digital Metronome</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg text-xs cursor-pointer"
            title="Expand Controls"
          >
            â†—ï¸
          </button>
          <button
            onClick={() => { setIsPlaying(false); onClose(); }}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg text-xs cursor-pointer"
            title="Close"
          >
            âœ•
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 sm:w-96 bg-gray-950/95 border border-teal-500/50 rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-fade-in text-white space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-950 border border-teal-500/40 flex items-center justify-center text-teal-400 text-sm font-bold">
            â±ï¸
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Digital Metronome</h4>
            <p className="text-[10px] text-teal-400 font-medium">Rhythm & Lyric Scansion Overlay</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white text-xs p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
            title="Minimize to Floating Bar"
          >
            ðŸ—•
          </button>
          <button
            onClick={() => { setIsPlaying(false); onClose(); }}
            className="text-gray-400 hover:text-white text-xs p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
            title="Close"
          >
            âœ•
          </button>
        </div>
      </div>

      {/* Visual LED Beat Flasher */}
      <div className="flex items-center justify-center gap-3 py-2 bg-gray-900/80 rounded-2xl border border-gray-800">
        {Array.from({ length: beatsPerBar }).map((_, idx) => {
          const isActive = isPlaying && currentBeat === idx;
          const isAccent = idx === 0;
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full transition-all duration-75 flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? isAccent
                      ? "bg-teal-400 text-gray-950 scale-125 shadow-[0_0_15px_rgba(45,212,191,0.8)]"
                      : "bg-indigo-400 text-gray-950 scale-110 shadow-[0_0_10px_rgba(129,140,248,0.7)]"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}
              >
                {idx + 1}
              </div>
              <span className={`text-[9px] font-mono ${isActive ? (isAccent ? "text-teal-300 font-bold" : "text-indigo-300") : "text-gray-600"}`}>
                {isAccent ? "DOWN" : "UP"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Large BPM Display & Direct Increments */}
      <div className="flex items-center justify-between bg-gray-900 p-3 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAdjustBpm(-5)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg cursor-pointer"
            title="-5 BPM"
          >
            -5
          </button>
          <button
            onClick={() => handleAdjustBpm(-1)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg cursor-pointer"
            title="-1 BPM"
          >
            -1
          </button>
        </div>

        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-mono text-3xl font-black text-teal-300 tracking-tight">{bpm}</span>
            <span className="text-xs text-gray-400 font-semibold">BPM</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAdjustBpm(1)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg cursor-pointer"
            title="+1 BPM"
          >
            +1
          </button>
          <button
            onClick={() => handleAdjustBpm(5)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg cursor-pointer"
            title="+5 BPM"
          >
            +5
          </button>
        </div>
      </div>

      {/* BPM Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
          <span>Tempo Range: 30 - 240 BPM</span>
          <span className="text-teal-400 font-mono">{bpm} BPM</span>
        </div>
        <input
          type="range"
          min="40"
          max="220"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-teal-400"
        />
      </div>

      {/* Time Signature & Tap Tempo */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
          {[
            { val: 4, label: '4/4' },
            { val: 3, label: '3/4' },
            { val: 6, label: '6/8' },
            { val: 2, label: '2/4' }
          ].map((ts) => (
            <button
              key={ts.val}
              onClick={() => setBeatsPerBar(ts.val)}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                beatsPerBar === ts.val
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {ts.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleTapTempo}
          className="py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>ðŸ‘† Tap Tempo</span>
        </button>
      </div>

      {/* Quick Genre Tempo Presets */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
          Quick Genre Tempos
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {GENRE_TEMPO_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.bpm}
              onClick={() => setBpm(p.bpm)}
              className={`p-1 text-[10px] rounded-lg border text-center transition-all cursor-pointer ${
                bpm === p.bpm
                  ? "bg-teal-950 border-teal-500 text-teal-300 font-bold"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{p.bpm}</div>
              <div className="text-[8px] truncate opacity-75">{p.label.split('/')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Play / Mute / Volume Bar */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-800">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            isMuted ? "bg-red-950/80 border-red-500/40 text-red-300" : "bg-gray-900 border-gray-800 text-gray-300 hover:text-white"
          }`}
          title={isMuted ? "Unmute Audio Click" : "Mute Audio (Silent Visual Flash)"}
        >
          {isMuted ? "ðŸ”‡ Silent" : "ðŸ”Š Sound"}
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
            isPlaying
              ? "bg-gradient-to-r from-amber-500 to-red-500 text-white"
              : "bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950"
          }`}
        >
          <span>{isPlaying ? "â¹ Stop Metronome" : "â–¶ Start Metronome"}</span>
        </button>
      </div>
    </div>
  );
};
export default DigitalMetronomeOverlay;
