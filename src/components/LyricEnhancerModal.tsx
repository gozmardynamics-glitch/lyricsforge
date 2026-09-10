import React, { useState, useEffect } from "react";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- 5-TYPE AI LYRIC LINE ENHANCER MODAL ---
type EnhancerType = 'word_replacement' | 'rhyme_finder' | 'metaphor_expansion' | 'syllable_meter' | 'viral_hook';

interface LyricEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLine: string;
  songContext?: {
    title?: string;
    genre?: string;
    mood?: string;
    rhymeScheme?: string;
    language?: string;
  };
  onApplyReplacement?: (newLine: string) => void;
}

const LyricEnhancerModal: React.FC<LyricEnhancerModalProps> = ({
  isOpen,
  onClose,
  initialLine,
  songContext = {} as NonNullable<LyricEnhancerModalProps['songContext']>,
  onApplyReplacement
}) => {
  const [activeType, setActiveType] = useState<EnhancerType>('word_replacement');
  const [currentLine, setCurrentLine] = useState(initialLine || "");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [targetSyllables, setTargetSyllables] = useState(8);
  const [rhymeTargetWord, setRhymeTargetWord] = useState("");
  const [customPromptNote, setCustomPromptNote] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (initialLine) {
      setCurrentLine(initialLine);
      const words = initialLine.trim().split(/\s+/);
      if (words.length > 0) {
        setRhymeTargetWord(words[words.length - 1].replace(/[^a-zA-Z]/g, ''));
      }
      const initialSyllables = countSyllablesInLine(initialLine);
      if (initialSyllables > 0) {
        setTargetSyllables(initialSyllables);
      }
    }
  }, [initialLine, isOpen]);

  if (!isOpen) return null;

  const handleRunEnhancement = async () => {
    if (!currentLine.trim()) return;
    setIsLoading(true);
    setSuggestions([]);
    setCopiedIdx(null);
    try {
      const lang = songContext.language || "English";
      const genre = songContext.genre || "Pop";
      const mood = songContext.mood || "Euphoric & Festival Vibe";

      let prompt = "";
      if (activeType === 'word_replacement') {
        prompt = `You are a master songwriter vocabulary enhancer.
Original lyric line: "${currentLine}"
Language: ${lang}
Genre: ${genre}
Mood: ${mood}

Task: Provide 4 distinct tiers of enhanced variations for this line:
1. "Power Verbs & Action" (dynamic visceral verbs)
2. "Sensory & Cinematic Imagery" (colors, textures, tactile senses)
3. "Genre Vernacular & Slang" (authentic to ${genre})
4. "Poetic Elevation" (deep metaphors)

Return a JSON array with 4 objects:
[
  { "category": string, "enhancedLine": string, "explanation": string, "syllableCount": number }
]`;
      } else if (activeType === 'rhyme_finder') {
        const target = rhymeTargetWord || currentLine.split(/\s+/).pop() || "night";
        prompt = `You are a lyricist rhyme & assonance master.
Target word / sound to rhyme with: "${target}"
Context line: "${currentLine}"
Language: ${lang}
Genre: ${genre}

Generate 4 creative rhyming line completions or rhyme families for "${target}":
1. "Perfect Rhyme Pair" (Exact acoustic vowel + consonant match)
2. "Slant / Near Rhyme" (Modern contemporary slant rhyme)
3. "Multi-Syllable / Compound Rhyme" (2-3 syllable rhyme match)
4. "Assonance / Internal Rhyme" (Vowel harmonic echo)

Return JSON array with 4 objects:
[
  { "category": string, "enhancedLine": string, "explanation": string, "syllableCount": number }
]`;
      } else if (activeType === 'metaphor_expansion') {
        prompt = `You are a lyrical metaphor architect.
Original line: "${currentLine}"
Language: ${lang}
Genre: ${genre}
Mood: ${mood}

Transform this line into 4 cinematic, unforgettable metaphors:
1. "Cosmic / Ethereal Metaphor" (stars, oceans, time)
2. "Urban / Neon Noir" (concrete, headlights, glass)
3. "Raw & Conversational" (intimate confession, vulnerable)
4. "Stadium Anthem Hook" (colossal crowd-shouting metaphor)

Return JSON array with 4 objects:
[
  { "category": string, "enhancedLine": string, "explanation": string, "syllableCount": number }
]`;
      } else if (activeType === 'syllable_meter') {
        prompt = `You are a music scansion and rhythmic meter specialist.
Original line: "${currentLine}" (Current syllables: ${countSyllablesInLine(currentLine)})
Target Syllable Count: ${targetSyllables} syllables
Language: ${lang}
Genre: ${genre}

Rewrite the line preserving the core emotion while strictly hitting distinct rhythmic cadences:
1. "${targetSyllables} Syllables (Straight 4/4 Meter)"
2. "${targetSyllables} Syllables (Syncopated Bounce / Off-beat)"
3. "${targetSyllables - 2 > 0 ? targetSyllables - 2 : 6} Syllables (Punchy Compressed)"
4. "${targetSyllables + 2} Syllables (Flowing Melodic Run)"

Return JSON array with 4 objects:
[
  { "category": string, "enhancedLine": string, "explanation": string, "syllableCount": number }
]`;
      } else if (activeType === 'viral_hook') {
        prompt = `You are a viral hitmaker crafting high-retention lyric hooks.
Original line: "${currentLine}"
Language: ${lang}
Genre: ${genre}
Mood: ${mood}

Craft 4 viral hook & punchline variations:
1. "15-Second TikTok / Reel Earworm" (repetitive, catchy, memorable)
2. "Instagram Caption Punchline" (high-quotability, witty, iconic)
3. "Call-and-Response Crowd Chant" (stadium energy)
4. "Emotional Gut-Punch Hook" (universal relatability)

Return JSON array with 4 objects:
[
  { "category": string, "enhancedLine": string, "explanation": string, "syllableCount": number }
]`;
      }

      const res = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                enhancedLine: { type: Type.STRING },
                explanation: { type: Type.STRING },
                syllableCount: { type: Type.NUMBER }
              },
              required: ["category", "enhancedLine", "explanation", "syllableCount"]
            }
          }
        }
      });

      const parsed = JSON.parse(res.text || "[]");
      if (Array.isArray(parsed)) {
        setSuggestions(parsed);
      }
    } catch (err) {
      console.error("Enhancer error:", err);
      alert("Failed to generate line enhancements. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySuggestion = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleApply = (newLine: string) => {
    if (onApplyReplacement) {
      onApplyReplacement(newLine);
      onClose();
    } else {
      navigator.clipboard.writeText(newLine);
      alert(`Copied "${newLine}" to clipboard!`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-900 border border-teal-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-teal-950/80 border border-teal-500/30 rounded-xl">âœ¨</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                Lyricist Pro AI Suite
              </span>
              <h3 className="text-xl font-black text-white mt-1">5-Type Lyric Line Enhancer</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-2 rounded-full hover:bg-gray-800 cursor-pointer"
          >
            âœ•
          </button>
        </div>

        {/* Enhancer Type Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gray-950 p-1.5 rounded-2xl border border-gray-800">
          {[
            { id: 'word_replacement', label: 'ðŸ”¤ Vocabulary', desc: 'Power Verbs & Slang' },
            { id: 'rhyme_finder', label: 'ðŸŽ¯ Rhyme Suite', desc: 'Slant & Assonance' },
            { id: 'metaphor_expansion', label: 'ðŸŒŒ Metaphors', desc: 'Cinematic Imagery' },
            { id: 'syllable_meter', label: 'â±ï¸ Syllable / Meter', desc: 'Scansion & Flow' },
            { id: 'viral_hook', label: 'ðŸ”¥ Viral Hook', desc: 'TikTok & Earworms' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id as EnhancerType)}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                activeType === tab.id
                  ? "bg-teal-600 text-white shadow-md ring-1 ring-teal-400/50"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[9px] opacity-75 font-normal truncate">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Input Line Bar */}
        <div className="space-y-2 bg-gray-800/80 p-4 rounded-2xl border border-gray-700/80">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Target Line to Enhance:</span>
            <span className="text-teal-300 font-mono">
              â™© {countSyllablesInLine(currentLine)} syllables
            </span>
          </div>
          <input
            type="text"
            value={currentLine}
            onChange={(e) => setCurrentLine(e.target.value)}
            placeholder="Type or paste a lyric line (e.g., 'Dancing under the streetlight with you')..."
            className="w-full bg-gray-900 text-white text-sm font-semibold p-3.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          {/* Sub-controls based on active enhancer */}
          {activeType === 'rhyme_finder' && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs text-gray-300 font-bold whitespace-nowrap">End Word to Rhyme:</label>
              <input
                type="text"
                value={rhymeTargetWord}
                onChange={(e) => setRhymeTargetWord(e.target.value)}
                placeholder="e.g., tonight, fire, dance"
                className="bg-gray-900 text-white text-xs p-2 rounded-lg border border-gray-700 w-48 focus:ring-1 focus:ring-teal-400"
              />
            </div>
          )}

          {activeType === 'syllable_meter' && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs text-gray-300 font-bold whitespace-nowrap">
                Target Syllables: <span className="text-teal-300 font-mono text-sm">{targetSyllables}</span>
              </label>
              <input
                type="range"
                min="4"
                max="16"
                value={targetSyllables}
                onChange={(e) => setTargetSyllables(Number(e.target.value))}
                className="w-48 h-2 bg-gray-700 rounded-lg cursor-pointer accent-teal-400"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunEnhancement}
              disabled={isLoading || !currentLine.trim()}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isLoading || !currentLine.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-500 text-white active:scale-95"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Enhancing with AI...</span>
                </>
              ) : (
                <span>âš¡ Generate AI Variations</span>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 hover:border-teal-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md group"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      â™© {item.syllableCount || countSyllablesInLine(item.enhancedLine)} syl
                    </span>
                  </div>
                  <p className="text-white text-sm sm:text-base font-semibold leading-relaxed group-hover:text-teal-200 transition-colors">
                    "{item.enhancedLine}"
                  </p>
                  {item.explanation && (
                    <p className="text-gray-400 text-xs italic">{item.explanation}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopySuggestion(item.enhancedLine, idx)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {copiedIdx === idx ? "Copied!" : "ðŸ“‹ Copy"}
                  </button>
                  {onApplyReplacement && (
                    <button
                      onClick={() => handleApply(item.enhancedLine)}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      âœ“ Replace Line
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            !isLoading && (
              <div className="text-center py-12 text-gray-400 space-y-2 border border-dashed border-gray-800 rounded-2xl">
                <span className="text-3xl">âœ¨</span>
                <p className="text-xs">
                  Select an enhancement mode above and click <strong>Generate AI Variations</strong> to explore 4 tailored lyrical possibilities.
                </p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// LyricSheetExportModal moved to src/components/LyricSheetExportModal.tsx (code-split).
export default LyricEnhancerModal;
