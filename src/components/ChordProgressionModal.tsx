import React, { useState } from "react";
import { getActiveModelId } from "../agents/llmRegistry";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- GENRE-AWARE CHORD PROGRESSION GENERATOR & SUGGESTER ---
interface ChordProgression {
  numerals: string;
  chords: string[];
  key: string;
  name: string;
  vibe: string;
  tempo: string;
  description: string;
}

const GENRE_CHORD_DATABASE: Record<string, ChordProgression[]> = {
  "Pop": [
    { numerals: "I - V - vi - IV", chords: ["C", "G", "Am", "F"], key: "C Major", name: "The Axis of Awesome (Pop Anthem)", vibe: "Uplifting, Catchy, Epic", tempo: "110-128 BPM", description: "The most successful pop chord progression in music history (Let It Be, Someone Like You, Don't Stop Believin')." },
    { numerals: "vi - IV - I - V", chords: ["Am", "F", "C", "G"], key: "C Major / A Minor", name: "Sensitive Pop Progression", vibe: "Emotional, Driving, Introspective", tempo: "95-120 BPM", description: "Vulnerable yet dynamic pop ballad energy (Apologize, Poker Face, Complicated)." },
    { numerals: "I - IV - vi - V", chords: ["C", "F", "Am", "G"], key: "C Major", name: "Modern Synthpop Bounce", vibe: "Euphoric, Nostalgic, Bright", tempo: "120-130 BPM", description: "High retention upbeat progression with smooth voice leading." },
    { numerals: "ii - V - I - IV", chords: ["Dm", "G", "C", "F"], key: "C Major", name: "Sophisticated Pop / Jazz-Pop", vibe: "Smooth, Chic, Melodic", tempo: "88-105 BPM", description: "Warm harmonic cycle found in polished contemporary bedroom and electro-pop." }
  ],
  "Rock": [
    { numerals: "I - V - vi - IV", chords: ["E", "B", "C#m", "A"], key: "E Major", name: "Stadium Rock Anthem", vibe: "Triumphant, Colossal, Driving", tempo: "125-145 BPM", description: "Iconic stadium rock crescendo with ringing open guitar strings." },
    { numerals: "i - bVII - bVI - bVII", chords: ["Am", "G", "F", "G"], key: "A Minor (Aeolian)", name: "Classic Rock & Metal Cadence", vibe: "Gritty, Heroic, Driving", tempo: "115-140 BPM", description: "The legendary Aeolian descent (Stairway to Heaven, Iron Maiden, Green Day)." },
    { numerals: "I - bVII - IV - I", chords: ["D", "C", "G", "D"], key: "D Mixolydian", name: "Southern / Hard Rock Power Groover", vibe: "Rebellious, Raw, Bluesy", tempo: "110-135 BPM", description: "Sweet Home Alabama, AC/DC, Tom Petty classic rock groove." },
    { numerals: "i - bVI - bIII - bVII", chords: ["Em", "C", "G", "D"], key: "E Minor", name: "Post-Grunge / Alt-Rock Engine", vibe: "Dark, Heavy, Cathartic", tempo: "90-120 BPM", description: "Huge chorus explosion for heavy distorted guitars and passionate vocals." }
  ],
  "Hip Hop": [
    { numerals: "i - bVI - iv - V7", chords: ["Dm", "Bb", "Gm", "A7"], key: "D Minor", name: "Cinematic Dark Trap / Boom Bap", vibe: "Nocturnal, Gritty, Menacing", tempo: "75-90 / 140-160 BPM", description: "Deep minor harmonic tension tailored for 808 bass slides and punchy snares." },
    { numerals: "i9 - iv9 - v9 - i9", chords: ["Fm9", "Bbm9", "Cm9", "Fm9"], key: "F Minor", name: "Late Night Melodic Hip Hop", vibe: "Atmospheric, Introspective, Luxurious", tempo: "80-95 BPM", description: "Drake / Travis Scott style moody lush extensions." },
    { numerals: "i - bVII - bVI - V", chords: ["Em", "D", "C", "B7"], key: "E Minor (Andalusian)", name: "Spanish / Flamenco Trap Fusion", vibe: "Fiery, Dramatic, Rhythmic", tempo: "90-130 BPM", description: "Spanish cadence blended with punchy modern drill & trap beats." },
    { numerals: "i - iv - i - V", chords: ["Am", "Dm", "Am", "E7"], key: "A Minor", name: "Classic 90s Boom-Bap Loop", vibe: "Raw, Underground, Authentic", tempo: "88-96 BPM", description: "Timeless jazz-sampled golden era hip hop progression." }
  ],
  "R&B": [
    { numerals: "i7 - iv7 - bVII7 - IIImaj7", chords: ["Em7", "Am7", "D7", "Gmaj7"], key: "E Minor / G Major", name: "Neo-Soul Circle of 5ths", vibe: "Sensual, Silky, Timeless", tempo: "72-88 BPM", description: "Velvety neo-soul & contemporary R&B progression for complex vocal harmonies." },
    { numerals: "ii7 - V7 - Imaj7 - vi7", chords: ["Dm7", "G7", "Cmaj7", "Am7"], key: "C Major", name: "Smooth Contemporary R&B", vibe: "Warm, Intimate, Luxurious", tempo: "68-85 BPM", description: "Classic jazzy cadence loved by SZA, Frank Ocean, and Daniel Caesar." },
    { numerals: "Imaj9 - vi7 - IVmaj7 - V7sus4", chords: ["Fmaj9", "Dm7", "Bbmaj7", "C7sus4"], key: "F Major", name: "Modern Bedroom R&B Drift", vibe: "Dreamy, Romantic, Lush", tempo: "75-90 BPM", description: "Lush major 9ths and suspended chords for acoustic guitar & Rhodes piano." }
  ],
  "Country": [
    { numerals: "I - IV - V - I", chords: ["G", "C", "D", "G"], key: "G Major", name: "Nashville 3-Chord Tradition", vibe: "Heartfelt, Traditional, Storytelling", tempo: "80-120 BPM", description: "The authentic foundation of country, bluegrass, and roots music." },
    { numerals: "I - V - IV - V", chords: ["D", "A", "G", "A"], key: "D Major", name: "Country-Pop Tailgate Anthem", vibe: "Uplifting, Sunny, Driving", tempo: "105-125 BPM", description: "Modern radio country banger (Luke Combs, Morgan Wallen style)." },
    { numerals: "I - vi - IV - V", chords: ["C", "Am", "F", "G"], key: "C Major", name: "50s Doo-Wop Country Ballad", vibe: "Nostalgic, Romantic, Sweet", tempo: "65-80 BPM", description: "Classic heartfelt ballad progression for emotional storytelling." },
    { numerals: "vi - IV - I - V", chords: ["Em", "C", "G", "D"], key: "G Major / E Minor", name: "Dark Outlaw / Modern Country Rock", vibe: "Gritty, Rebellious, Moody", tempo: "95-115 BPM", description: "Modern outlaw country cadence with heavy acoustic strums and slide guitar." }
  ],
  "Electronic / EDM": [
    { numerals: "vi - IV - I - V", chords: ["Am", "F", "C", "G"], key: "A Minor / C Major", name: "Festival Anthem Drop", vibe: "Euphoric, Colossal, Festival", tempo: "128 BPM", description: "The definitive mainstage progressive house & festival anthem buildup." },
    { numerals: "i - bVI - bVII - i", chords: ["Fm", "Db", "Eb", "Fm"], key: "F Minor", name: "Melodic Techno / Trance Engine", vibe: "Hypnotic, Driving, Mysterious", tempo: "124-132 BPM", description: "Driving repetition for pulsating synth arpeggios and heavy sub-bass." },
    { numerals: "bVI - bVII - i - i", chords: ["Ab", "Bb", "Cm", "Cm"], key: "C Minor", name: "Future Bass / Synthwave Surge", vibe: "Emotional, Massive, Cinematic", tempo: "140-150 / 80-100 BPM", description: "Big supersaw sidechained chords with huge emotional lift." }
  ],
  "Jazz": [
    { numerals: "ii7 - V7 - Imaj7 - VI7", chords: ["Dm7", "G7", "Cmaj7", "A7"], key: "C Major", name: "Classic 2-5-1 Turnaround", vibe: "Sophisticated, Timeless, Swung", tempo: "90-180 BPM", description: "The cornerstone of jazz harmony and Great American Songbook standards." },
    { numerals: "Imaj7 - vi7 - ii7 - V7", chords: ["Ebmaj7", "Cm7", "Fm7", "Bb7"], key: "Eb Major", name: "Rhythm Changes Head", vibe: "Bouncy, Joyful, Virtuosic", tempo: "120-220 BPM", description: "Gershwin 'I Got Rhythm' standard swing template." }
  ],
  "Afrobeats": [
    { numerals: "I - vi - IV - V", chords: ["F", "Dm", "Bb", "C"], key: "F Major", name: "Afro-Fusion Summer Groove", vibe: "Infectious, Bouncy, Warm", tempo: "98-106 BPM", description: "Burna Boy / Wizkid syncopated log-drum and guitar skank progression." },
    { numerals: "vi - V - IV - V", chords: ["Am", "G", "F", "G"], key: "C Major / A Minor", name: "Amapiano / Afro-Pop Cadence", vibe: "Mellow, Soulful, Danceable", tempo: "108-115 BPM", description: "Smooth rolling Rhodes chords over deep basslines." }
  ],
  "Latin / Reggaeton": [
    { numerals: "i - bVI - bIII - bVII", chords: ["Am", "F", "C", "G"], key: "A Minor", name: "Urban Reggaeton Hitmaker", vibe: "Sensual, Danceable, High-Energy", tempo: "92-100 BPM", description: "Bad Bunny & J Balvin Dembow rhythm chord driver." },
    { numerals: "i - iv - bVII - bIII", chords: ["Dm", "Gm", "C", "F"], key: "D Minor", name: "Latin Pop & Bachata Passion", vibe: "Passionate, Flowing, Romantic", tempo: "120-130 BPM", description: "Guitar-driven Latin ballad and bachata progression." }
  ]
};

// Chord Progression Studio Modal
interface ChordProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  genre: string;
  songTitle?: string;
  mood?: string;
}

const ChordProgressionModal: React.FC<ChordProgressionModalProps> = ({
  isOpen,
  onClose,
  genre,
  songTitle = "Untitled Song",
  mood = "Melodic"
}) => {
  const [selectedKey, setSelectedKey] = useState("Original");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiChords, setAiChords] = useState<ChordProgression[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!isOpen) return null;

  // Normalize genre to find best database matches
  const matchedKey = Object.keys(GENRE_CHORD_DATABASE).find(k =>
    genre.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(genre.toLowerCase())
  ) || "Pop";

  const defaultProgressions = GENRE_CHORD_DATABASE[matchedKey] || GENRE_CHORD_DATABASE["Pop"];
  const displayProgressions = aiChords || defaultProgressions;

  const handleCopyProgression = async (prog: ChordProgression, idx: number) => {
    const text = `🎼 ${prog.name} (${prog.numerals})\nChords: ${prog.chords.join(" - ")}\nKey: ${prog.key} | Tempo: ${prog.tempo}\nVibe: ${prog.vibe}\n${prog.description}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAiChords = async () => {
    setIsAiLoading(true);
    try {
      const prompt = `You are a legendary music theorist and chart-topping chord progression master.
Song: "${songTitle}"
Genre: ${genre}
Mood: ${mood}
Additional instructions: ${customPrompt || "Create 4 highly innovative, genre-authentic chord progressions"}

Provide 4 distinct chord progression arrangements:
1. "Radio Hit / Primary Loop" (High retention, viral appeal)
2. "Emotional Verse-to-Chorus Lift" (Building harmonic tension)
3. "Sophisticated Secondary / Bridge Turnaround" (Extended/borrowed chords)
4. "Cinematic / Modal Accent" (Deep atmosphere)

Return a JSON array with 4 objects:
[
  {
    "numerals": string, // e.g., "I - V - vi - IV" or "i7 - iv9 - bVII - IIImaj7"
    "chords": [string, string, string, string], // actual chord names e.g. ["C", "G", "Am", "F"]
    "key": string, // e.g. "C Major" or "F# Minor"
    "name": string, // Descriptive title
    "vibe": string, // 2-3 vibe words
    "tempo": string, // e.g. "120-128 BPM"
    "description": string // Theoretical context & songwriting advice
  }
]`;

      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numerals: { type: Type.STRING },
                chords: { type: Type.ARRAY, items: { type: Type.STRING } },
                key: { type: Type.STRING },
                name: { type: Type.STRING },
                vibe: { type: Type.STRING },
                tempo: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["numerals", "chords", "key", "name", "vibe", "tempo", "description"]
            }
          }
        }
      });

      const parsed = JSON.parse(res.text || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAiChords(parsed);
      }
    } catch (e) {
      console.error("Failed to generate AI chord progressions", e);
      alert("Failed to generate chords. Falling back to curated database.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-900 border border-teal-500/40 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-indigo-950/80 border border-indigo-500/30 rounded-xl">🎹</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
                  Harmony Studio
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                  Genre: {genre || "Pop"}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">Chord Progression Suggester & Harmonic Suite</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-2 rounded-full hover:bg-gray-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* AI Customization & Search Bar */}
        <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Custom vibe or target key for ${genre} (e.g., 'Minor 7ths for bittersweet rainy vibe', 'Key of G Major')...`}
            className="w-full bg-gray-900 text-white text-xs p-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={handleGenerateAiChords}
            disabled={isAiLoading}
            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            {isAiLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Harmonizing...</span>
              </>
            ) : (
              <span>✨ AI Smart Harmony</span>
            )}
          </button>
          {aiChords && (
            <button
              onClick={() => setAiChords(null)}
              className="px-3 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Progression Cards Grid */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[500px]">
          {displayProgressions.map((prog, idx) => (
            <div
              key={idx}
              className="bg-gray-950/80 p-4 sm:p-5 rounded-2xl border border-gray-800 hover:border-indigo-500/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                      {prog.numerals}
                    </span>
                    <span className="text-[11px] font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded">
                      Key: {prog.key}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                       {prog.tempo}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{prog.name}</h4>
                </div>

                <button
                  onClick={() => handleCopyProgression(prog, idx)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-indigo-600 text-gray-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start cursor-pointer border border-gray-700"
                >
                  {copiedIdx === idx ? "✓ Copied Chords!" : "📋 Copy Progression"}
                </button>
              </div>

              {/* Large Chord Blocks Display */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 py-1">
                {prog.chords.map((chord, cIdx) => (
                  <div
                    key={cIdx}
                    className="bg-gray-900/90 border border-indigo-500/20 hover:border-indigo-400/60 p-3 rounded-xl flex flex-col items-center justify-center transition-all group"
                  >
                    <span className="text-[10px] text-gray-500 font-mono">Chord {cIdx + 1}</span>
                    <span className="text-base sm:text-xl font-black text-indigo-200 group-hover:text-indigo-400 tracking-wider">
                      {chord}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 text-gray-400">
                <span className="text-gray-300 italic">{prog.description}</span>
                <span className="text-[11px] text-indigo-400 font-bold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                  {prog.vibe}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3 text-xs text-gray-400">
          <span>💡 Apply these chord progressions to acoustic guitars, pianos, or digital synths when recording your vocal lead sheet.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChordProgressionModal;
