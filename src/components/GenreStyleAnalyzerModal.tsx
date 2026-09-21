import React, { useState, useEffect } from "react";
import { getActiveModelId } from "../agents/llmRegistry";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- GENRE STYLE & VOCABULARY ANALYZER COMPONENT ---
interface GenreDNA {
  genre: string;
  signatureVibe: string;
  recommendedBpm: string;
  keyMeters: string;
  signatureVocabulary: string[];
  rhymePreferences: string;
  lyricalTropes: string[];
  suggestedStylisticPrompts: string[];
  instrumentationHighlights: string[];
}

const GENRE_DNA_DATABASE: Record<string, GenreDNA> = {
  "Afrobeats": {
    genre: "Afrobeats",
    signatureVibe: "Polyrhythmic warmth, infectious bounce, joyous storytelling, romantic devotion & celebration.",
    recommendedBpm: "98 - 108 BPM",
    keyMeters: "4/4 with syncopated 3:2 clave / log-drum percussion grooves",
    signatureVocabulary: [
      "Vibration", "Energy", "Body", "Whine", "Blessing", "Grace", "Fine girl", "Odo", "Shoko",
      "Gbe body", "Dey for you", "Forever", "Sweet loving", "Jara", "Overflow", "Destiny", "Chop life"
    ],
    rhymePreferences: "AABB Couplets, rhythmic call-and-response, vocal cadence repetition, Pidgin & multilingual flair.",
    lyricalTropes: [
      "Reassuring a lover that nobody else compares",
      "Hustle, rising from humble beginnings to international celebration",
      "Dancing under the sunset with unstoppable physical rhythm",
      "Gratitude for life, blessings, and protective spiritual grace"
    ],
    suggestedStylisticPrompts: [
      "Afrobeats syncopated summer anthem with log-drum bounce and infectious romantic hook",
      "Lagos-to-London celebration track celebrating success, perseverance and unshakeable joy",
      "Intimate highlife-infused Afropop love ballad with gentle acoustic guitar and melodic runs"
    ],
    instrumentationHighlights: ["Log Drums (Amapiano)", "Shakers & Shekere", "Electric Muted Guitars", "Saxophone Hooks", "Warm Sub-Bass"]
  },
  "Synthwave": {
    genre: "Synthwave",
    signatureVibe: "Nostalgic 1980s neon futurism, retro-futuristic driving melancholy, glowing midnight horizons.",
    recommendedBpm: "118 - 128 BPM",
    keyMeters: "Straight 4/4 driving four-on-the-floor with gated snare",
    signatureVocabulary: [
      "Neon", "Chrome", "Midnight", "Highway", "Horizon", "Static", "Grid", "Electric", "Overdrive",
      "Cassette", "Outrun", "Starlight", "Echoes", "Retrofitted", "Cyber", "Speedometer", "Digital rain"
    ],
    rhymePreferences: "ABAB Alternate Rhyme or AABB with long, sustained cinematic vowel tails (night/light, glow/know).",
    lyricalTropes: [
      "Cruising an empty coastal highway at 2 AM under purple city lights",
      "A lost love frozen in analog tape memories and fading signals",
      "Escaping an oppressive cyberpunk metropolis toward the glowing horizon",
      "Heartbeats synchronizing with an electronic pulse in the dark"
    ],
    suggestedStylisticPrompts: [
      "Outrun driving anthem with driving arpeggiated basslines, analog synthesizers, and neon midnight imagery",
      "Melancholic retrowave ballad capturing 80s nostalgia, VHS tape glitches, and unfulfilled promises",
      "High-octane cyberpunk chase track with gated snare drums, electric solos, and nocturnal rebellion"
    ],
    instrumentationHighlights: ["Analog Synth Pads (Jupiter/Juno)", "Arpeggiated Bassline", "Gated Reverb Snare", "Electric Lead Guitar Solo", "LinnDrum"]
  },
  "Trap": {
    genre: "Trap",
    signatureVibe: "Dark, gritty, hypnotic high-retention cadence, relentless ambition, triplet flow scansion.",
    recommendedBpm: "130 - 145 BPM (Half-time feel at 65 - 72 BPM)",
    keyMeters: "4/4 with rapid rolling hi-hats, flams, and sliding 808 sub-bass",
    signatureVocabulary: [
      "Grind", "Elevation", "808", "Code", "Pressure", "Shadows", "Crown", "Vision", "Uncut",
      "Legacy", "Blueprint", "Phantom", "Timepiece", "Vault", "Relentless", "Heavyweight", "Orbit"
    ],
    rhymePreferences: "Dense internal multisyllabic rhymes, rolling triplet cadence, staccato end rhymes, punchline hooks.",
    lyricalTropes: [
      "Turning nothing into an untouchable empire against all odds",
      "Trust issues, keeping a tight inner circle, loyalty over royalty",
      "Midnight focus in the studio building a generational legacy",
      "Ice-cold focus when under intense external pressure"
    ],
    suggestedStylisticPrompts: [
      "Dark hypnotic trap anthem with rolling hi-hat triplets, sliding 808 sub-bass, and ambitious multisyllabic verses",
      "Cinematic trap anthem featuring minor-key piano chords, haunting choral pads, and triumphant punchlines",
      "Fast-paced melodic trap banger with autotuned vocal harmonies and infectious 15-second hook"
    ],
    instrumentationHighlights: ["Sliding 808 Sub-Bass", "Rolling 32nd-note Hi-Hats", "Dark Grand Piano Chords", "Brass Hits", "Tape-Saturated Bells"]
  },
  "Pop": {
    genre: "Pop",
    signatureVibe: "Universal emotional clarity, crystal-clear hook retention, relatable storytelling, dynamic chorus lift.",
    recommendedBpm: "115 - 124 BPM",
    keyMeters: "4/4 standard with punchy kick-snare and memorable melodic top-line",
    signatureVocabulary: [
      "Spark", "Gravity", "Heartbeat", "Fever", "Collide", "Breathe", "Mirror", "Shadows", "Gold",
      "Permanent", "Electric", "Unstoppable", "Whisper", "Daylight", "Signal", "Freefall", "Magnetic"
    ],
    rhymePreferences: "ABAB / AABB with crisp assonance, phonetic vowel symmetry, and high-retention earworm chants.",
    lyricalTropes: [
      "The irresistible magnetic pull of a new romantic connection",
      "Triumphant self-empowerment and stepping fearlessly into the spotlight",
      "Vulnerable late-night confessions before the party ends",
      "Dancing away heartbreak with friends in a crowded room"
    ],
    suggestedStylisticPrompts: [
      "Modern radio pop anthem with explosive dynamic chorus lift, soaring vocal run, and relatable lyrics",
      "Acoustic-driven intimate pop ballad building into a full stadium pop production with lush vocal harmonies",
      "Upbeat dance-pop earworm featuring punchy four-on-the-floor kick, synth plucks, and chantable pre-chorus"
    ],
    instrumentationHighlights: ["Vocal Chop Leads", "Modern Sidechained Bass", "Clean Acoustic Plucks", "Layered Vocal Harmonies", "Crisp Pop Claps"]
  },
  "R&B": {
    genre: "R&B",
    signatureVibe: "Sensual intimacy, vocal runs, rich chord progressions, vulnerable honesty & late-night atmosphere.",
    recommendedBpm: "75 - 95 BPM",
    keyMeters: "4/4 or 6/8 with smooth neo-soul swing and lush seventh/ninth chords",
    signatureVocabulary: [
      "Velvet", "Whisper", "Silk", "Surrender", "Intoxicated", "Craving", "Unfold", "Frequency", "Warmth",
      "Tension", "Sanctuary", "Vulnerable", "Addicted", "Resonance", "Afterglow", "Linger", "Sublime"
    ],
    rhymePreferences: "Internal rhymes, soft slant rhymes (consonance/assonance), flowing melodic scansion with rubato timing.",
    lyricalTropes: [
      "Late night pillow talk and deep emotional vulnerability",
      "The delicate push-and-pull dynamic of passionate romance",
      "Healing from past love while opening up to someone genuine",
      "Unmatched sensual chemistry that feels timeless"
    ],
    suggestedStylisticPrompts: [
      "Smooth contemporary R&B ballad with lush Rhodes piano, deep sub-bass, and emotional vocal runs",
      "Late-night neo-soul groove with jazz chord progressions, crisp rimshots, and intimate lyrics",
      "90s-inspired slow jam with layered falsetto harmonies, sensual bridge, and lingering chorus"
    ],
    instrumentationHighlights: ["Rhodes / Wurlitzer E-Piano", "Muted Bass Guitar", "Finger Snaps & Rimshots", "Lush String Swells", "Subtle Synth Plucks"]
  },
  "Rock": {
    genre: "Rock",
    signatureVibe: "Raw electric energy, driving rebellion, anthemic stadium sing-alongs, visceral guitars and grit.",
    recommendedBpm: "125 - 145 BPM",
    keyMeters: "4/4 hard-hitting backbeat on beats 2 and 4",
    signatureVocabulary: [
      "Ignite", "Rumble", "Static", "Thunder", "Rebel", "Chains", "Shatter", "Ashes", "Furious",
      "Voltage", "Riot", "Iron", "Unbroken", "Wildfire", "Screaming", "Outlaw", "Edge"
    ],
    rhymePreferences: "AABB / ABAB with punchy masculine rhymes, abrasive plosive consonants, and shout-along refrain hooks.",
    lyricalTropes: [
      "Defying expectations and breaking free from conformity",
      "The adrenaline rush of live performance and rock-and-roll freedom",
      "Surviving hardship with grit, scars, and resilient brotherhood",
      "Raging against dishonest systems and finding personal truth"
    ],
    suggestedStylisticPrompts: [
      "High-octane stadium rock anthem with roaring distorted guitar riffs, pounding drum fills, and anthemic chorus",
      "Grungy alternative rock track featuring soft-verse/explosive-chorus dynamics and introspective lyrics",
      "Classic driving heartland rock ballad with acoustic foundation, hammond organ, and soaring guitar solo"
    ],
    instrumentationHighlights: ["Overdriven Electric Guitars", "Heavy Acoustic Drum Kit", "Pounding Bass Guitar", "Hammond B3 Organ", "Distorted Vocal FX"]
  },
  "Country": {
    genre: "Country",
    signatureVibe: "Down-to-earth authenticity, vivid narrative storytelling, heartfelt family/heritage themes & acoustic warmth.",
    recommendedBpm: "90 - 110 BPM",
    keyMeters: "4/4 train beat or 3/4 waltz with acoustic guitar strumming",
    signatureVocabulary: [
      "Dust", "Tailgate", "Gravel", "Hometown", "Front porch", "Whiskey", "Faith", "Sunday", "Heartstring",
      "Old pine", "Riverbank", "Campfire", "Roots", "Hard work", "Golden hour", "Unpaved", "Tradition"
    ],
    rhymePreferences: "ABCB Ballad Stanza or AABB story rhyming with warm colloquial cadence and narrative turns in the bridge.",
    lyricalTropes: [
      "Returning to your hometown roots after chasing distant dreams",
      "The quiet beauty of lifelong love built through small everyday moments",
      "Hard work, integrity, and unwinding on a Friday evening by the tailgate",
      "Lessons passed down through generations from grandparents"
    ],
    suggestedStylisticPrompts: [
      "Heartfelt modern country storytelling ballad with pedal steel guitar, acoustic picking, and emotional bridge",
      "High-energy country-rock radio track with lively fiddle, banjo rolls, and tailgate party lyrics",
      "Introspective acoustic country waltz reflecting on family heritage, faith, and simple blessings"
    ],
    instrumentationHighlights: ["Pedal Steel Guitar", "Fiddle & Banjo", "Acoustic Martin D-28", "Telecaster Twang", "Gentle Brush Snare"]
  },
  "K-Pop": {
    genre: "K-Pop",
    signatureVibe: "Dynamic genre-bending, multi-part vocal architecture, explosive hooks, high-concept visual metaphors.",
    recommendedBpm: "120 - 132 BPM",
    keyMeters: "4/4 high-energy tempo with beat switches between verse, pre-chorus, and drop",
    signatureVocabulary: [
      "Spotlight", "Prism", "Crown", "Gravity", "Infinity", "Unveil", "Blaze", "Magnetic", "Universe",
      "Challenger", "Sparkle", "Supernova", "Velocity", "Illusion", "Iconic", "Fever", "Dimension"
    ],
    rhymePreferences: "Bilingual English/Korean seamless hook blends, rhythmic rap-to-vocal transitions, catchy syllable earworms.",
    lyricalTropes: [
      "Unstoppable self-confidence and conquering the stage as a team",
      "An electric, magical romantic spark that defies time and space",
      "Transformation from trainee daydreamer to global shining icon",
      "Breaking free from societal boxes with unique style and color"
    ],
    suggestedStylisticPrompts: [
      "High-energy K-Pop title track with dynamic beat switches, explosive brass drop, and dual vocal/rap stanzas",
      "Dreamy synth-pop K-Pop B-side with shimmering 80s pads, breezy falsetto melodies, and romantic lyrics",
      "Fierce girl-crush anthem featuring heavy 808 sub-bass, chantable catchphrases, and rapid rap verse"
    ],
    instrumentationHighlights: ["Brass Stabs", "Synth Pluck Arpeggios", "808 Bass Drops", "Layered Group Chants", "Sidechained Sub-Pads"]
  },
  "Electronic / EDM": {
    genre: "Electronic / EDM",
    signatureVibe: "Euphoric festival builds, massive dynamic drops, unified crowd transcendence, driving tempo.",
    recommendedBpm: "126 - 130 BPM",
    keyMeters: "4/4 four-on-the-floor with rising snare risers and sweeping white noise transitions",
    signatureVocabulary: [
      "Euphoria", "Infinite", "Current", "Elevation", "Pulse", "Laser", "Ignite", "Surrender", "Resonance",
      "Ascend", "Transcend", "Frequency", "Gravity", "Limitless", "Beacon", "Radiate", "Unstoppable"
    ],
    rhymePreferences: "Simple, highly chantable AABB couplets engineered for maximum crowd unison before the drop.",
    lyricalTropes: [
      "Losing yourself in the music with thousands of unified souls",
      "Feeling weightless and free as the bass drops",
      "Holding onto this unforgettable festival night forever",
      "Energy transcending physical limits into pure light"
    ],
    suggestedStylisticPrompts: [
      "Mainstage EDM festival progressive anthem with emotional piano breakdown, sweeping build-up, and euphoric drop",
      "Future bass banger with rich vocal chops, lush supersaw chords, and uplifting lyrics",
      "Melodic techno track with hypnotic rolling bassline, dark atmospheric pads, and ethereal vocal mantras"
    ],
    instrumentationHighlights: ["Supersaw Lead Synths", "Sidechained Sub-Bass", "Snare Risers & Downlifters", "Vocal Chop Leads", "Punchy 909 Kick"]
  },
  "Latin / Reggaeton": {
    genre: "Latin / Reggaeton",
    signatureVibe: "Sensual Dembow rhythm, warm tropical heat, charismatic swagger, irresistible dancefloor connection.",
    recommendedBpm: "90 - 100 BPM",
    keyMeters: "4/4 Dembow pattern (Boom-cha-boom-chick)",
    signatureVocabulary: [
      "Fuego", "Calor", "Bailar", "Suave", "Ritmo", "Noche", "Sabor", "Corazón", "Pasión",
      "Dembow", "Playa", "Breeze", "Candela", "Sensual", "Destino", "Mirada", "Seduction"
    ],
    rhymePreferences: "AABB / ABAB with rich vowel resonance, Spanish/English Spanglish fusion, and rhythmic flow.",
    lyricalTropes: [
      "Two strangers locking eyes on a crowded tropical dancefloor",
      "Summer romance by the beach under the Caribbean moon",
      "Celebration of beauty, dance, and living life without regrets",
      "Irresistible physical rhythm that takes over until morning"
    ],
    suggestedStylisticPrompts: [
      "Sensual modern Reggaeton track with crisp Dembow beat, warm synth plucks, and romantic bilingual hook",
      "Upbeat Latin pop fiesta anthem with live brass, acoustic nylon guitar, and crowd-chant chorus",
      "Atmospheric urban Latin trap ballad with deep 808s, melancholy synth keys, and passionate lyrics"
    ],
    instrumentationHighlights: ["Classic Dembow Drum Kit", "Nylon-String Spanish Guitar", "Latin Brass Section", "Subby Synth Bass", "Shakers & Timbales"]
  },
  "Lo-Fi & Chillhop": {
    genre: "Lo-Fi & Chillhop",
    signatureVibe: "Cozy rainy-day nostalgia, vinyl crackle warmth, introspective calm, relaxed study & coffeehouse flow.",
    recommendedBpm: "70 - 85 BPM",
    keyMeters: "4/4 with relaxed swing and unquantized organic timing",
    signatureVocabulary: [
      "Raindrop", "Vinyl", "Coffee", "Windowpane", "Overcast", "Solitude", "Cozy", "Amber", "Breeze",
      "Daydream", "Softly", "Lofi", "Nostalgia", "Quiet", "Unwind", "Faded", "Polaroid"
    ],
    rhymePreferences: "Soft slant rhymes, conversational cadence, peaceful unhurried poetic lines with gentle imagery.",
    lyricalTropes: [
      "Watching the rain trickle down a coffee shop window",
      "Peaceful late-night solitude and wandering thoughts",
      "Fond memories preserved like faded polaroid photographs",
      "Finding tranquility in the gentle, slow rhythms of life"
    ],
    suggestedStylisticPrompts: [
      "Cozy Lo-Fi chillhop song with dusty vinyl crackle, warm Rhodes chords, and introspective poetic verses",
      "Gentle acoustic Lo-Fi ballad with mellow fingerpicked guitar, soft tape flutter, and peaceful lyrics",
      "Late-night study beat with jazzy saxophone accents, rain sounds, and conversational vocal delivery"
    ],
    instrumentationHighlights: ["Dusty Rhodes Piano", "Vinyl Crackle & Tape Flutter", "Muted Jazz Guitar", "Lo-Fi Acoustic Kick & Snare", "Ambient Rain Sounds"]
  }
};

interface GenreStyleAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGenre: string;
  onSelectGenre?: (genre: string) => void;
  onApplyPrompt?: (promptText: string) => void;
  onApplyVocabularyWord?: (word: string) => void;
}

const GenreStyleAnalyzerModal: React.FC<GenreStyleAnalyzerModalProps> = ({
  isOpen,
  onClose,
  currentGenre,
  onSelectGenre,
  onApplyPrompt,
  onApplyVocabularyWord
}) => {
  const [selectedGenre, setSelectedGenre] = useState(currentGenre || "Pop");
  const [customAIAnalysis, setCustomAIAnalysis] = useState<GenreDNA | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  useEffect(() => {
    if (currentGenre) {
      setSelectedGenre(currentGenre);
      setCustomAIAnalysis(null);
    }
  }, [currentGenre, isOpen]);

  if (!isOpen) return null;

  // Retrieve curated DNA or generate custom AI breakdown
  const activeDNA: GenreDNA = customAIAnalysis || GENRE_DNA_DATABASE[selectedGenre] || {
    genre: selectedGenre,
    signatureVibe: `Authentic, evocative expression rooted in ${selectedGenre} tradition with modern production values.`,
    recommendedBpm: "100 - 125 BPM",
    keyMeters: "4/4 standard cadence with genre-specific syncopation",
    signatureVocabulary: ["Harmony", "Rhythm", "Soul", "Heartbeat", "Journey", "Echo", "Passion", "Horizon", "Freedom"],
    rhymePreferences: "ABAB Alternate Rhyme or AABB Couplets with lyrical symmetry.",
    lyricalTropes: [
      `Signature thematic storytelling true to ${selectedGenre}`,
      "Personal emotional transformation through musical rhythm",
      "Memorable anthem hooks connecting with live audiences"
    ],
    suggestedStylisticPrompts: [
      `Dynamic ${selectedGenre} song featuring vibrant instrumental textures, soaring melodies, and authentic lyricism`,
      `Intimate acoustic-driven ${selectedGenre} ballad with rich emotional depth and memorable hook`
    ],
    instrumentationHighlights: ["Lead Acoustic/Electric Instruments", "Rhythmic Percussion Section", "Bass Foundation", "Atmospheric Layers"]
  };

  const handleDeepAIAnalyze = async () => {
    setIsGeneratingAI(true);
    try {
      const prompt = `You are a legendary musicologist, record producer, and lyricist.
Analyze the genre "${selectedGenre}" and provide deep, professional songwriting stylistic DNA.

Output JSON with this exact schema:
{
  "genre": "${selectedGenre}",
  "signatureVibe": string (2 sentences detailing the sonic emotional essence and atmosphere),
  "recommendedBpm": string (e.g., "110 - 128 BPM"),
  "keyMeters": string (time signature, scansion rhythm, groove characteristics),
  "signatureVocabulary": array of 12-16 evocative keywords/nouns/verbs specific to ${selectedGenre},
  "rhymePreferences": string (rhyming conventions, assonance, cadence flow),
  "lyricalTropes": array of 4 authentic storytelling themes,
  "suggestedStylisticPrompts": array of 3 click-to-use master lyric prompts,
  "instrumentationHighlights": array of 5 signature musical instruments/elements
}`;

      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              genre: { type: Type.STRING },
              signatureVibe: { type: Type.STRING },
              recommendedBpm: { type: Type.STRING },
              keyMeters: { type: Type.STRING },
              signatureVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
              rhymePreferences: { type: Type.STRING },
              lyricalTropes: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedStylisticPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
              instrumentationHighlights: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["genre", "signatureVibe", "recommendedBpm", "keyMeters", "signatureVocabulary", "rhymePreferences", "lyricalTropes", "suggestedStylisticPrompts", "instrumentationHighlights"]
          }
        }
      });

      const parsed = JSON.parse(res.text || "{}");
      if (parsed && parsed.genre) {
        setCustomAIAnalysis(parsed);
      }
    } catch (e) {
      console.error("Failed custom genre analysis:", e);
      alert("Failed to analyze genre via AI. Using curated genre database.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyWord = (word: string) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    if (onApplyVocabularyWord) {
      onApplyVocabularyWord(word);
    }
    setTimeout(() => setCopiedWord(null), 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-900 border border-teal-500/40 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/40 rounded-2xl text-2xl">
              
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                Genre Intelligence & Lexicon Studio
              </span>
              <h3 className="text-xl font-black text-white mt-1">Genre Style & Vocabulary Analyzer</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-2 rounded-full hover:bg-gray-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Genre Selector Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-950 p-3.5 rounded-2xl border border-gray-800">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <label className="text-xs font-bold text-gray-300 whitespace-nowrap">Select Genre to Analyze:</label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setCustomAIAnalysis(null);
                if (onSelectGenre) onSelectGenre(e.target.value);
              }}
              className="bg-gray-900 text-teal-300 font-bold p-2.5 rounded-xl border border-gray-700 text-xs flex-1 focus:ring-2 focus:ring-teal-400 focus:outline-none"
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDeepAIAnalyze}
            disabled={isGeneratingAI}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            {isGeneratingAI ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Extracting Sonic DNA...</span>
              </>
            ) : (
              <span>⚡ Deep AI Genre Dissection</span>
            )}
          </button>
        </div>

        {/* DNA Information Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-800/90 p-3.5 rounded-xl border border-gray-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-400"> Recommended BPM Tempo</span>
              <p className="text-white font-mono font-bold text-sm">{activeDNA.recommendedBpm}</p>
            </div>

            <div className="bg-gray-800/90 p-3.5 rounded-xl border border-gray-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-400"> Scansion & Meter Groove</span>
              <p className="text-gray-200 font-semibold">{activeDNA.keyMeters}</p>
            </div>

            <div className="bg-gray-800/90 p-3.5 rounded-xl border border-gray-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-400">🎯 Rhyme Scheme Density</span>
              <p className="text-gray-200 font-semibold">{activeDNA.rhymePreferences}</p>
            </div>
          </div>

          {/* Sonic Atmosphere */}
          <div className="bg-gray-800/70 p-4 rounded-2xl border border-gray-700/80 space-y-1.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-teal-300">🌌 Signature Sonic Atmosphere & Vibe</span>
            <p className="text-gray-200 text-sm leading-relaxed">{activeDNA.signatureVibe}</p>
          </div>

          {/* Signature Vocabulary & Slang Palette */}
          <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-300">
                🔤 Curated Genre Vocabulary & Keyword Palette (Click to Insert / Copy)
              </span>
              <span className="text-[10px] text-gray-400">Click any keyword to add to your workspace</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeDNA.signatureVocabulary.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyWord(word)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all border text-xs cursor-pointer flex items-center gap-1 active:scale-95 ${
                    copiedWord === word
                      ? "bg-green-600 border-green-400 text-white shadow-lg"
                      : "bg-gray-900 hover:bg-teal-950 text-teal-200 hover:text-white border-teal-500/30 hover:border-teal-400"
                  }`}
                  title="Click to copy and insert into custom ideas"
                >
                  <span>{word}</span>
                  {copiedWord === word ? <span className="text-[10px]">✓</span> : <span className="text-[10px] opacity-60">+</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Lyrical Tropes & Story Arcs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-300">
                📖 High-Impact Lyrical Tropes & Themes
              </span>
              <ul className="space-y-1.5 text-gray-300">
                {activeDNA.lyricalTropes.map((trope, tIdx) => (
                  <li key={tIdx} className="flex items-start gap-2">
                    <span className="text-teal-400 font-bold">›</span>
                    <span>{trope}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-300">
                🎸 Signature Instrumentation & Sonics
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeDNA.instrumentationHighlights.map((inst, iIdx) => (
                  <span
                    key={iIdx}
                    className="px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-300 font-medium rounded-lg text-xs"
                  >
                    🎵 {inst}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Click-to-Use Master Stylistic Prompts */}
          <div className="bg-gray-800/90 p-4 rounded-2xl border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-300">
                🚀 Master Stylistic Prompts (Ready to Apply)
              </span>
              <span className="text-[10px] text-gray-400">Click Apply to load directly into prompt generator</span>
            </div>
            <div className="space-y-2">
              {activeDNA.suggestedStylisticPrompts.map((promptText, pIdx) => (
                <div
                  key={pIdx}
                  className="p-3 bg-gray-900/90 border border-gray-700/90 rounded-xl hover:border-teal-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <p className="text-gray-200 text-xs leading-relaxed font-medium group-hover:text-teal-200">
                    "{promptText}"
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(promptText);
                        alert(`Copied prompt: "${promptText}"`);
                      }}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold rounded-lg transition-all"
                    >
                      📋 Copy
                    </button>
                    {onApplyPrompt && (
                      <button
                        onClick={() => {
                          onApplyPrompt(promptText);
                          onClose();
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-md active:scale-95"
                      >
                        ✓ Use Prompt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <span className="text-[11px] text-gray-400">
            Current Genre: <strong className="text-teal-300">{selectedGenre}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
          >
            Close Analyzer
          </button>
        </div>
      </div>
    </div>
  );
};
export default GenreStyleAnalyzerModal;
