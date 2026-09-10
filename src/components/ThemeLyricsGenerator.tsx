import React, { useState, useEffect, useCallback } from "react";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

const ThemeLyricsGenerator = ({
  recentThemes,
  stylePresets,
  onSaveRecentTheme,
  onOpenAgentStudio
}: {
  recentThemes: RecentTheme[];
  stylePresets: StylePreset[];
  onSaveRecentTheme: (themeItem: RecentTheme) => void;
  onOpenAgentStudio: () => void;
}) => {
  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [rhymeScheme, setRhymeScheme] = useState("ABAB (Alternate Rhyme)");
  const [emotionalMood, setEmotionalMood] = useState("Melancholic & Reflective");
  const [customMoodText, setCustomMoodText] = useState("");
  const [structure, setStructure] = useState("Verse - Chorus - Verse - Chorus - Bridge - Chorus");
  const [selectedStylePresetId, setSelectedStylePresetId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load persisted theme state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_THEME_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.genre) setGenre(parsed.genre);
        if (parsed.rhymeScheme) setRhymeScheme(parsed.rhymeScheme);
        if (parsed.emotionalMood) setEmotionalMood(parsed.emotionalMood);
        if (parsed.customMoodText) setCustomMoodText(parsed.customMoodText);
        if (parsed.structure) setStructure(parsed.structure);
        if (parsed.selectedStylePresetId) setSelectedStylePresetId(parsed.selectedStylePresetId);
        if (parsed.suggestedTitle) setSuggestedTitle(parsed.suggestedTitle);
        if (parsed.generatedLyrics) setGeneratedLyrics(parsed.generatedLyrics);
      }
    } catch (e) {
      console.error("Error reading LS_THEME_STATE:", e);
    }
  }, []);

  // Function to save current state to localStorage
  const saveThemeState = useCallback(() => {
    try {
      const stateToSave = {
        theme,
        genre,
        rhymeScheme,
        emotionalMood,
        customMoodText,
        structure,
        selectedStylePresetId,
        suggestedTitle,
        generatedLyrics,
        timestamp: Date.now()
      };
      localStorage.setItem(LS_THEME_STATE, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Error writing LS_THEME_STATE:", e);
    }
  }, [theme, genre, rhymeScheme, emotionalMood, customMoodText, structure, selectedStylePresetId, suggestedTitle, generatedLyrics]);

  // Immediate save on state changes
  useEffect(() => {
    saveThemeState();
  }, [saveThemeState]);

  // Auto-save periodically every 3 seconds & on beforeunload
  useEffect(() => {
    const timer = setInterval(() => {
      saveThemeState();
    }, 3000);

    const handleBeforeUnload = () => {
      saveThemeState();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveThemeState]);

  const activeMood = emotionalMood === "Custom Mood..." ? customMoodText : emotionalMood;
  const activeStylePreset = stylePresets.find(p => p.id === selectedStylePresetId);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!theme.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    let styleInstruction = "";
    if (activeStylePreset) {
      styleInstruction = `
Apply this specific Lyric Style Influence / Artist Reference Preset:
Style Name: "${activeStylePreset.name}" (${activeStylePreset.artistReference})
Style Description: "${activeStylePreset.description}"
Cadence & Meter: "${activeStylePreset.cadenceAndMeter}"
Rhyme Density: "${activeStylePreset.rhymeDensity}"
Vocabulary Tier: "${activeStylePreset.vocabularyStyle}"
`;
    }

    const prompt = `
You are a master lyricist and Billboard hit song producer.
Write complete, high-quality song lyrics based on the following details:

Song Theme / Concept / Storyline: "${theme}"
Music Genre: ${genre}
Preferred Rhyme Scheme: ${rhymeScheme}
Emotional Mood / Tone: "${activeMood}" (Crucial: Ensure word choice, phrasing, and emotional intensity deeply reflect this tone!)
Song Structure: ${structure}
${styleInstruction}

Requirements:
1. Write poetic, emotionally resonant song lyrics adhering strictly to the preferred ${rhymeScheme} rhyme scheme for verses and choruses.
2. Infuse the specific emotional mood "${activeMood}" into every stanza.
3. Use clear markdown section titles like [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro].
4. Review the theme ('${theme}') and description to suggest a viral, catchy song title that cleverly rhymes or plays on words with the concept.
5. Return strict JSON format with properties:
   - "songTitle": string (the viral catchy song title suggested based on lyrics & theme)
   - "lyrics": string (the complete song lyrics formatted with markdown section headers)
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              songTitle: { type: Type.STRING, description: "A viral catchy song title suggested based on the lyrics & theme" },
              lyrics: { type: Type.STRING, description: "Full song lyrics formatted with markdown section headers" }
            },
            required: ["songTitle", "lyrics"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      if (data.songTitle && data.lyrics) {
        setSuggestedTitle(data.songTitle);
        setGeneratedLyrics(data.lyrics);

        // Save into recent themes history
        const newRecentItem: RecentTheme = {
          id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          theme: theme.trim(),
          genre,
          mood: activeMood,
          rhymeScheme,
          structure,
          suggestedTitle: data.songTitle,
          generatedLyrics: data.lyrics,
          stylePresetName: activeStylePreset?.name,
          timestamp: Date.now()
        };
        onSaveRecentTheme(newRecentItem);
      } else {
        throw new Error("Invalid response schema from AI");
      }
    } catch (err: any) {
      console.error("Theme Lyrics Generation Error:", err);
      setErrorMsg("Error generating song lyrics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecentTheme = (item: RecentTheme) => {
    setTheme(item.theme);
    setGenre(item.genre);
    setRhymeScheme(item.rhymeScheme || "ABAB (Alternate Rhyme)");
    if (EMOTIONAL_MOODS.includes(item.mood)) {
      setEmotionalMood(item.mood);
      setCustomMoodText("");
    } else {
      setEmotionalMood("Custom Mood...");
      setCustomMoodText(item.mood);
    }
    setStructure(item.structure || "Verse - Chorus - Verse - Chorus - Bridge - Chorus");
    setSuggestedTitle(item.suggestedTitle);
    setGeneratedLyrics(item.generatedLyrics);
  };

  const textToCopy = suggestedTitle 
    ? `ðŸŽµ ${suggestedTitle}\nGenre: ${genre} | Mood: ${activeMood} | Scheme: ${rhymeScheme}\n\n${generatedLyrics}`
    : generatedLyrics;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left / Main Input & Output Panel */}
      <div className="lg:col-span-8 space-y-6">
        {/* Theme Input Card */}
        <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-700/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Song Theme Lyrics Generator</h2>
                <p className="text-gray-400 text-xs">Select genre, emotional mood & rhyme scheme to co-create song lyrics.</p>
              </div>
            </div>

            <button
              onClick={onOpenAgentStudio}
              type="button"
              className="px-3.5 py-2 bg-gradient-to-r from-teal-900 to-gray-800 hover:from-teal-800 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <span>ðŸ¤– Agentic Studio</span>
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Song Theme & Story Line <span className="text-teal-400">*</span>
              </label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., A rainy late-night drive through neon lights, contemplating second chances and chasing forgotten dreams..."
                rows={4}
                required
                className="w-full bg-gray-900 text-gray-100 p-4 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder-gray-500 text-sm leading-relaxed"
              />
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Music Genre */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Music Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Rhyme Scheme */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Rhyme Scheme</label>
                <select
                  value={rhymeScheme}
                  onChange={(e) => setRhymeScheme(e.target.value)}
                  className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                >
                  {RHYME_SCHEMES.map((rs) => (
                    <option key={rs} value={rs}>{rs}</option>
                  ))}
                </select>
              </div>

              {/* Emotional Mood Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Emotional Mood / Tone
                </label>
                <select
                  value={emotionalMood}
                  onChange={(e) => setEmotionalMood(e.target.value)}
                  className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                >
                  {EMOTIONAL_MOODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Custom Mood Text Input (if Custom selected) */}
              {emotionalMood === "Custom Mood..." ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                    Specify Custom Mood
                  </label>
                  <input
                    type="text"
                    value={customMoodText}
                    onChange={(e) => setCustomMoodText(e.target.value)}
                    placeholder="e.g., Cynical yet triumphant"
                    className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                  />
                </div>
              ) : (
                /* Lyric Style Preset Selection */
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                    Artist / Style Preset (Optional)
                  </label>
                  <select
                    value={selectedStylePresetId}
                    onChange={(e) => setSelectedStylePresetId(e.target.value)}
                    className="w-full bg-gray-900 text-teal-300 p-3 rounded-lg border border-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                  >
                    <option value="">Standard Style (Default)</option>
                    {stylePresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Song Structure */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Song Structure</label>
              <input
                type="text"
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                placeholder="e.g., Verse - Chorus - Verse - Chorus - Bridge - Chorus"
                className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !theme.trim()}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-lg ${
                isLoading || !theme.trim()
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-teal-600 hover:bg-teal-500 active:scale-[0.99] cursor-pointer"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Generating Viral Title & Rhyming Lyrics...</span>
                </>
              ) : (
                <>
                  <span>ðŸŽµ Generate Lyrics & Viral Song Title</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3.5 bg-red-900/40 border border-red-700/60 rounded-xl text-red-200 text-sm">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Display Area for Suggested Catchy Song Title & Formatted Lyrics */}
        {generatedLyrics && (
          <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-2xl animate-fade-in space-y-6">
            {/* Prominent Suggested Catchy Title */}
            {suggestedTitle && (
              <div className="border-b border-gray-700/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold text-teal-400 bg-teal-950/60 border border-teal-500/30 px-2.5 py-1 rounded">
                    Suggested Viral Song Title
                  </span>
                  <h3 className="text-3xl font-black text-white mt-2 flex items-center gap-2">
                    <span className="text-teal-400">ðŸŽµ</span> {suggestedTitle}
                  </h3>
                </div>
                <CopyButton textToCopy={textToCopy} label="Copy Lyrics & Title" />
              </div>
            )}

            {/* Formatted Lyrics with Markdown-like Parser */}
            <div className="bg-gray-900/90 p-6 rounded-xl border border-gray-700/70 max-h-[600px] overflow-y-auto">
              {parseLyricsMarkdown(generatedLyrics)}
            </div>
          </div>
        )}
      </div>

      {/* Right / Sidebar: Recent Themes */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-gray-700">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>ðŸ•’</span> Recent Themes
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                Last 5
              </span>
            </h3>
          </div>

          <p className="text-[11px] text-gray-400 mt-2">
            Click any recent theme to instantly reload its parameters & lyrics. Saved automatically in your browser!
          </p>

          <div className="mt-4 space-y-3">
            {recentThemes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs italic bg-gray-900/40 rounded-xl border border-gray-800">
                No recent themes generated yet. Generate a song theme to build your history!
              </div>
            ) : (
              recentThemes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecentTheme(item)}
                  className="bg-gray-900/90 hover:bg-gray-900 p-3.5 rounded-xl border border-gray-700/80 hover:border-teal-500/50 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded">
                      {item.genre}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                    ðŸŽµ {item.suggestedTitle || "Untitled Theme"}
                  </h4>

                  <p className="text-[11px] text-gray-300 line-clamp-2 italic">
                    "{item.theme}"
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-800 text-[10px] text-gray-400">
                    <span>Mood: {item.mood}</span>
                    <span className="text-teal-400 font-medium group-hover:underline">Load &rarr;</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Song Configuration Card Component
export default ThemeLyricsGenerator;
