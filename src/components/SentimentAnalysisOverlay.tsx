import React, { useState } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import { generateLyricsPdf } from "./generateLyricsPdf";

// --- SENTIMENT ANALYSIS OVERLAY (EMOTIONAL TONE PROGRESS BARS) ---
interface SentimentScore {
  happy: number;
  sad: number;
  aggressive: number;
  romantic: number;
  euphoric: number;
  overallMood: string;
  summary: string;
}

const computeFastSentiment = (text: string): SentimentScore => {
  const lower = text.toLowerCase();
  
  // Lexicon markers
  const happyWords = ["love", "smile", "dance", "light", "shine", "joy", "bright", "good", "celebrate", "party", "laugh", "flying", "free", "sun", "bliss", "alive", "beautiful", "high", "heaven"];
  const sadWords = ["cry", "alone", "dark", "rain", "hurt", "pain", "broken", "tears", "loss", "goodbye", "shadow", "cold", "bleed", "bleeding", "regret", "sorrow", "grief", "fading", "fall", "scars"];
  const aggroWords = ["fight", "fire", "rage", "blood", "kill", "break", "smash", "scream", "burn", "storm", "hate", "run", "strike", "war", "fury", "roar", "crush", "rebel", "heavy", "power"];
  const romanticWords = ["heart", "kiss", "touch", "forever", "sweet", "darling", "breathe", "hold", "eyes", "arms", "whisper", "desire", "passion", "soul", "embrace", "tender", "belong"];
  const euphoricWords = ["higher", "stars", "electric", "unstoppable", "champion", "sky", "infinity", "anthem", "magic", "glow", "ignite", "soar", "lightning", "euphoria", "crown"];

  let happyCount = 0;
  let sadCount = 0;
  let aggroCount = 0;
  let romanticCount = 0;
  let euphoricCount = 0;

  const words = lower.split(/\W+/).filter(Boolean);
  const total = words.length || 1;

  words.forEach(w => {
    if (happyWords.includes(w)) happyCount++;
    if (sadWords.includes(w)) sadCount++;
    if (aggroWords.includes(w)) aggroCount++;
    if (romanticWords.includes(w)) romanticCount++;
    if (euphoricWords.includes(w)) euphoricCount++;
  });

  // Calculate base percentages with natural baseline distributions
  const rawScores = {
    happy: Math.min(100, Math.round((happyCount / total) * 350 + 15)),
    sad: Math.min(100, Math.round((sadCount / total) * 350 + 10)),
    aggressive: Math.min(100, Math.round((aggroCount / total) * 350 + 8)),
    romantic: Math.min(100, Math.round((romanticCount / total) * 350 + 12)),
    euphoric: Math.min(100, Math.round((euphoricCount / total) * 350 + 14))
  };

  // Determine dominant mood
  const entries = Object.entries(rawScores);
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];

  const moodMap: Record<string, string> = {
    happy: "Radiant & Joyful",
    sad: "Melancholic & Reflective",
    aggressive: "Energetic & Assertive",
    romantic: "Intimate & Passionate",
    euphoric: "Triumphant & Uplifting"
  };

  return {
    ...rawScores,
    overallMood: moodMap[dominant] || "Dynamic & Emotional",
    summary: `Dominant emotion is ${moodMap[dominant]} with balanced lyrical tension.`
  };
};

const SentimentAnalysisOverlay: React.FC<{ lyricsText: string; isCollapsedDefault?: boolean }> = ({ lyricsText, isCollapsedDefault = false }) => {
  const [isExpanded, setIsExpanded] = useState(!isCollapsedDefault);
  const scores = computeFastSentiment(lyricsText);

  return (
    <div className="bg-gray-950/90 border border-gray-800 rounded-xl p-3.5 space-y-2.5 transition-all text-xs">
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="font-bold text-gray-200 uppercase tracking-wider text-[11px]">Sentiment & Emotional Tone</span>
          <span className="bg-teal-950 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/30 text-[10px]">
            {scores.overallMood}
          </span>
        </div>
        <button className="text-gray-400 hover:text-white text-xs font-semibold">
          {isExpanded ? "Hide Tone Meter ▲" : "Show Tone Meter ▼"}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-gray-800/80 animate-fade-in">
          {/* Happy / Joyful Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-300 font-medium flex items-center gap-1">
                <span>😊</span> Happy / Joyful
              </span>
              <span className="font-mono text-gray-400">{scores.happy}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${scores.happy}%` }}
              ></div>
            </div>
          </div>

          {/* Sad / Melancholic Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-300 font-medium flex items-center gap-1">
                <span>😢</span> Sad / Melancholic
              </span>
              <span className="font-mono text-gray-400">{scores.sad}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${scores.sad}%` }}
              ></div>
            </div>
          </div>

          {/* Aggressive / Hype Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <span>🔥</span> Aggressive / Punchy
              </span>
              <span className="font-mono text-gray-400">{scores.aggressive}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 to-red-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${scores.aggressive}%` }}
              ></div>
            </div>
          </div>

          {/* Romantic / Passionate Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-pink-400 font-medium flex items-center gap-1">
                <span>💖</span> Romantic / Intimate
              </span>
              <span className="font-mono text-gray-400">{scores.romantic}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-pink-500 to-purple-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${scores.romantic}%` }}
              ></div>
            </div>
          </div>

          {/* Euphoric / Anthem Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-teal-300 font-medium flex items-center gap-1">
                <span>✨</span> Euphoric / Stadium Vibe
              </span>
              <span className="font-mono text-gray-400">{scores.euphoric}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${scores.euphoric}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// generateLyricsPdf moved to src/components/generateLyricsPdf.ts
export default SentimentAnalysisOverlay;
