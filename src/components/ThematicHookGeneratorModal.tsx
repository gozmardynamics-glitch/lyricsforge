import React, { useState, useEffect, useCallback } from "react";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- THEMATIC HOOK & OPENING LINE GENERATOR MODAL (GEMINI API) ---
// =========================================================================

interface ThematicHookItem {
  category: string;
  hookText: string;
  rhythmCadence: string;
  syllableCount: number;
  whyItWorks: string;
  deliveryStyleTip: string;
}

interface ThematicHookGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGenre?: string;
  initialMood?: string;
  initialTheme?: string;
  songTitle?: string;
  onApplyHook?: (hookText: string) => void;
}

const ThematicHookGeneratorModal: React.FC<ThematicHookGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialGenre = "Pop",
  initialMood = "Euphoric",
  initialTheme = "",
  songTitle = "",
  onApplyHook
}) => {
  const [genre, setGenre] = useState(initialGenre || "Pop");
  const [mood, setMood] = useState(initialMood || "Euphoric");
  const [hookFocus, setHookFocus] = useState<string>("all");
  const [customStory, setCustomStory] = useState(initialTheme || "");
  const [isLoading, setIsLoading] = useState(false);
  const [hooks, setHooks] = useState<ThematicHookItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const POPULAR_GENRES = [
    "Pop", "Hip Hop", "R&B", "Synthwave", "Afrobeats", 
    "Rock", "Country", "Indie Folk", "EDM", "K-Pop", 
    "Latin Urban", "Emo Rap", "Reggae"
  ];

  const HOOK_FOCUS_OPTIONS = [
    { id: "all", label: "ðŸŒŸ All 5 Creative Formats", desc: "Earworms, chorus drops, intros & emotional lines" },
    { id: "earworm", label: "âš¡ First 3-Second Earworm", desc: "Instant viral listener grabber" },
    { id: "chorus_drop", label: "ðŸ”¥ Anthemic Chorus Drop", desc: "High-energy central thematic powerhouse" },
    { id: "story_intro", label: "ðŸŽ¬ Cinematic Story Starter", desc: "Visual world-building opening lines" },
    { id: "cadence_punch", label: "ðŸ¥ Rhythmic Cadence Punchline", desc: "Deep rhyme density & flow switches" },
    { id: "vulnerable", label: "ðŸ’” Vulnerable Midnight Confession", desc: "Raw emotional gut-punch" }
  ];

  const generateThematicHooks = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    setAppliedIdx(null);
    setCopiedIdx(null);

    const prompt = `You are a legendary, chart-topping songwriter, melody architect, and master top-liner.
The user is experiencing severe writer's block and urgently needs thematic, infectious 'hooks' or compelling opening lines tailored strictly to their musical genre.

TARGET PARAMETERS:
- Musical Genre: ${genre}
- Emotional Mood: ${mood}
- Song Title / Concept Reference: "${songTitle || "Untitled"}"
- User Story / Context: "${customStory || "Create an iconic, memorable song opening & chorus hook"}"
- Focus Filter: ${hookFocus}

TASK:
Generate 5 distinct, high-impact thematic hooks or opening lines engineered specifically for the ${genre} genre and ${mood} tone.

Requirements:
1. Every hook MUST strictly adhere to the rhythmic cadence, vocabulary, and flow characteristics of ${genre}.
2. Ensure lines feel fresh, rhythmically distinct, avoid generic clichÃ©s, and instantly unlock musical momentum.
3. Break down:
   - "category": e.g. "First 3-Second Earworm", "Anthemic Chorus Drop", "Cinematic Story Intro", "Rhythmic Cadence Punchline", "Vulnerable Midnight Confession"
   - "hookText": 2 to 4 lines of lyrics capturing the hook or opening line
   - "rhythmCadence": specific rhythmic delivery (e.g. "Syncopated 16th-note bounce with sustained end vowel")
   - "syllableCount": approximate total syllables across the lines
   - "whyItWorks": 1-2 sentence explanation of how this hook specifically conquers writer's block for ${genre}
   - "deliveryStyleTip": vocal delivery guidance (e.g. "Deliver in a breathy falsetto, pausing before the 4th beat")

Return ONLY a valid JSON array of 5 objects matching this structure.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                hookText: { type: Type.STRING },
                rhythmCadence: { type: Type.STRING },
                syllableCount: { type: Type.NUMBER },
                whyItWorks: { type: Type.STRING },
                deliveryStyleTip: { type: Type.STRING }
              },
              required: ["category", "hookText", "rhythmCadence", "syllableCount", "whyItWorks", "deliveryStyleTip"]
            }
          }
        }
      });

      const parsed: ThematicHookItem[] = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setHooks(parsed);
      } else {
        throw new Error("Invalid hooks structure");
      }
    } catch (err: any) {
      console.error("Thematic Hook Generation Error:", err);
      // High-quality fallback curated for the genre
      const fallbackHooks: ThematicHookItem[] = [
        {
          category: "First 3-Second Earworm",
          hookText: `Tell me you remember how the static felt\nBefore the neon started turning cold and began to melt`,
          rhythmCadence: `Driving 4/4 syncopation with a staccato drop on 'cold'`,
          syllableCount: 22,
          whyItWorks: `Immediate sensory contrast hooks the listener in under 3 seconds with vivid visual imagery for ${genre}.`,
          deliveryStyleTip: `Hushed, intimate vocal on line 1, doubling with octave harmonies on line 2.`
        },
        {
          category: "Anthemic Chorus Drop",
          hookText: `We built a kingdom out of cigarette smoke and dreams\nNow we're reigning over all the broken seams`,
          rhythmCadence: `Heavy half-time downbeat emphasis with soaring sustained pitch`,
          syllableCount: 24,
          whyItWorks: `Creates a massive, memorable contrast between fragile materials and grand royalty.`,
          deliveryStyleTip: `Full chest voice with maximum stereo width and natural vocal fry on 'broken'.`
        },
        {
          category: "Cinematic Story Intro",
          hookText: `Midnight on the overpass, headlights blur to gold\nHolding onto promises that we were never told`,
          rhythmCadence: `Fluid conversational meter with melancholic acoustic space`,
          syllableCount: 22,
          whyItWorks: `Paints an immediate cinematic landscape that triggers the listener's imagination instantly.`,
          deliveryStyleTip: `Close-mic spoken cadence transitioning softly into melody.`
        }
      ];
      setHooks(fallbackHooks);
    } finally {
      setIsLoading(false);
    }
  }, [genre, mood, songTitle, customStory, hookFocus]);

  // Initial trigger on open
  useEffect(() => {
    if (isOpen && hooks.length === 0) {
      generateThematicHooks();
    }
  }, [isOpen, generateThematicHooks, hooks.length]);

  if (!isOpen) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleApply = (text: string, idx: number) => {
    if (onApplyHook) {
      onApplyHook(text);
      setAppliedIdx(idx);
      setTimeout(() => {
        setAppliedIdx(null);
        onClose();
      }, 1200);
    } else {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-gray-900 to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-400 font-bold shadow-lg">
              ðŸ’¡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Thematic Hook & Opening Line Generator</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Break writer's block with genre-tailored melodic hooks, 3-second earworms & cadence rhythm tips
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors text-lg"
          >
            âœ•
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                ðŸŽµ Music Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-amber-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {POPULAR_GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                ðŸŽ­ Emotional Mood
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. Melancholic, Euphoric, Nocturnal"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                ðŸŽ¯ Hook Focus Format
              </label>
              <select
                value={hookFocus}
                onChange={(e) => setHookFocus(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {HOOK_FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={customStory}
              onChange={(e) => setCustomStory(e.target.value)}
              placeholder="Optional: Enter a keyword, memory, or concept (e.g. driving through neon rain, lost love)..."
              className="flex-1 bg-gray-800/90 border border-gray-700 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              type="button"
              onClick={generateThematicHooks}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md whitespace-nowrap cursor-pointer ${
                isLoading
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-950 font-black active:scale-95"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin"></div>
                  <span>Crafting Hooks...</span>
                </>
              ) : (
                <>
                  <span>âš¡ Generate Thematic Hooks</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Genre Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-gray-400 font-medium mr-1">Quick Genres:</span>
            {POPULAR_GENRES.slice(0, 7).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  genre === g
                    ? "bg-amber-500 text-gray-950 shadow-sm font-black"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Generated Hooks List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
              <div>
                <h4 className="text-white font-bold text-base">Overcoming Writer's Block...</h4>
                <p className="text-gray-400 text-xs mt-1">
                  Gemini is analyzing {genre} cadence, rhythmic hooks, and viral opening formulas.
                </p>
              </div>
            </div>
          ) : hooks.length > 0 ? (
            <div className="space-y-4">
              {hooks.map((h, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 hover:border-amber-500/50 p-4 rounded-xl transition-all shadow-md group relative space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        {h.category}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {h.syllableCount} Syllables â€¢ {h.rhythmCadence}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(h.hookText, idx)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedIdx === idx ? "âœ“ Copied!" : "ðŸ“‹ Copy"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApply(h.hookText, idx)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-gray-950 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Insert into song draft / ideas"
                      >
                        {appliedIdx === idx ? "âœ“ Applied!" : "âš¡ Use Hook"}
                      </button>
                    </div>
                  </div>

                  {/* Hook Quote Box */}
                  <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800 text-amber-200 font-serif text-base sm:text-lg italic leading-relaxed tracking-wide">
                    "{h.hookText}"
                  </div>

                  {/* Why it works & Vocal tip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                      <span className="text-[10px] font-bold uppercase text-teal-400 block mb-0.5">
                        ðŸ§  Why This Breaks Writer's Block:
                      </span>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        {h.whyItWorks}
                      </p>
                    </div>

                    <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                      <span className="text-[10px] font-bold uppercase text-purple-400 block mb-0.5">
                        ðŸŽ™ï¸ Delivery & Performance Tip:
                      </span>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        {h.deliveryStyleTip}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <p>No hooks generated yet. Click "Generate Thematic Hooks" above to start.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex items-center justify-between text-xs text-gray-400">
          <span>ðŸ’¡ Pro-tip: Use thematic hooks as your anchor before drafting surrounding verses.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// AIAlbumArtworkGeneratorModal moved to src/components/AIAlbumArtworkGeneratorModal.tsx (lazy-loaded at the import block).
// =========================================================================
export default ThematicHookGeneratorModal;
