export interface LyricDraftVersion {
  id: string;
  songId?: string;
  title: string;
  lyricsText: string;
  genre?: string;
  mood?: string;
  timestamp: number;
  tag: string;
  wordCount: number;
  lineCount: number;
  charCount: number;
}

export interface Song {
  id: string;
  title: string;
  genre: string;
  mood: string;
  structure: string;
  rhymeScheme: string;
  customIdeas: string;
  lyrics: string[][]; // [ [version1_line1, ...], [version2_line1, ...], [version3_line1, ...] ]
  isApproved: boolean;
  language?: string;
  musicKey?: string;
  stylePresetId?: string;
  youtubeStyleLink?: string;
  referenceSongTitle?: string;
  artistStyleName?: string;
  tags?: string[];
  /** AI note on why this title fits the album — shown in review */
  titleRationale?: string;
  /** Index of the version currently treated as primary (default 0 = V1) */
  activeLyricVersion?: number;
}

export interface Album {
  id: string;
  name: string;
  occasion: string;
  comments: string;
  genres: string[];
  songCount: number;
  songs: Song[];
  language?: string;
  /** Set when AI has filled titles + related fields and the tracklist awaits user review */
  titlesReadyForReview?: boolean;
  /** When the last title automation ran */
  titlesGeneratedAt?: number;
}

// 16-Language Support for Lyricist Pro
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸/🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸/🇲🇽' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷/🇵🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦/🇪🇬' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪/🇹🇿' }
];

export interface StylePreset {
  id: string;
  name: string;
  artistReference: string;
  description: string;
  cadenceAndMeter: string;
  rhymeDensity: string;
  vocabularyStyle: string;
  referenceLinkOrLyrics?: string;
}

export interface DraftTrack {
  id: string;
  title: string;
  styleNote: string;
  lyrics: string;
  viralityScore: number;
}

export interface RecentTheme {
  id: string;
  theme: string;
  genre: string;
  mood: string;
  rhymeScheme: string;
  structure: string;
  suggestedTitle: string;
  generatedLyrics: string;
  stylePresetName?: string;
  language?: string;
  timestamp: number;
}

export interface ViralityChecklist {
  hookSevenWordsOrLess: boolean;
  repeatableRhythmicMotif: boolean;
  instagramQuotableLines: string[];
  firstThreeSecondAttentionGrabber: string;
  universalEmotionalArc: boolean;
  trendingInstrumentationMatch: boolean;
}

export interface CriticEvaluation {
  viralityCritic: { score: number; critique: string; viralHookHighlight: string };
  literaryCritic: { score: number; critique: string; metaphorDepth: string };
  flowCritic: { score: number; critique: string; cadenceNotes: string };
  occasionFitCritic: { score: number; critique: string; themeAlignment: string };
  overallViralityScore: number;
  actionableSuggestions: string[];
}

export interface MusicProductionPackage {
  suggestedBpm: number;
  musicalKey: string;
  genreFusion: string;
  primaryInstrumentation: string[];
  vocalArrangement: string;
  productionTips: string[];
  referenceTracks: { title: string; artist: string; reason: string }[];
}

export interface AgenticLyricResult {
  songTitle: string;
  lyrics: string;
  viralHook: string;
  chartTrendInsight: string;
  styleFingerprintUsed: string;
  language?: string;
  draftTracks?: DraftTrack[];
  criticEvaluation: CriticEvaluation;
  musicProductionPackage: MusicProductionPackage;
  viralityChecklist: ViralityChecklist;
  executionLog: { step: string; detail: string; timestamp: string }[];
  revisedTimes: number;
  timestamp: number;
}

// --- LOCAL STORAGE KEYS ---
export const LS_RECENT_THEMES = "ai_lyrics_recent_themes_v2";
export const LS_THEME_STATE = "ai_lyrics_theme_state_v2";
export const LS_ALBUM_STATE = "ai_lyrics_album_state_v2";
export const LS_STYLE_PRESETS = "ai_lyrics_style_presets_v2";
export const LS_APP_STATE = "ai_lyrics_app_state_v2";
export const LS_AGENT_STATE = "ai_lyrics_agent_state_v2";
export const LS_APP_SETTINGS = "app_user_settings_v1";

export interface AppSettings {
  autoSaveInterval: number; // in seconds
  defaultRhymeScheme: string;
  lyricFontSize: 'sm' | 'base' | 'lg';
  exportFormat: 'txt' | 'json';
}

export interface ExtendedStyleTemplate extends StylePreset {
  genres?: string[];
  defaultRhymeScheme?: string;
  defaultMood?: string;
  isCustom?: boolean;
  samplePromptNotes?: string;
}
