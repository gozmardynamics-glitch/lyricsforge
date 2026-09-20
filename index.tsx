import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './src/index.css';
import { Type } from "@google/genai";
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import { AgentOrchestratorStudioModal } from './src/components/AgentOrchestratorStudioModal';
import { safeExtractJSON } from './src/agents/llmRegistry';
import {
  Tooltip,
  TooltipInfo,
  CopyButton,
  Spinner,
  CheckmarkIcon,
  parseLyricsMarkdown,
  countSyllablesInWord,
  countSyllablesInLine
} from './src/components/shared';
import {
  LyricDraftVersion,
  Song,
  Album,
  LanguageOption,
  LANGUAGES,
  StylePreset,
  DraftTrack,
  RecentTheme,
  ViralityChecklist,
  CriticEvaluation,
  MusicProductionPackage,
  AgenticLyricResult,
  LS_RECENT_THEMES,
  LS_THEME_STATE,
  LS_ALBUM_STATE,
  LS_STYLE_PRESETS,
  LS_APP_STATE,
  LS_AGENT_STATE,
  LS_APP_SETTINGS,
  AppSettings,
  ExtendedStyleTemplate
} from './src/types';

// Heavy modals and views are code-split: they only load when first rendered.
const AIAlbumArtworkGeneratorModal = React.lazy(() => import('./src/components/AIAlbumArtworkGeneratorModal'));
const ProductionApiModal = React.lazy(() => import('./src/components/ProductionApiModal'));
const GenreStyleAnalyzerModal = React.lazy(() => import('./src/components/GenreStyleAnalyzerModal'));
const CollaborativeLyricRoomModal = React.lazy(() => import('./src/components/CollaborativeLyricRoomModal'));
const DigitalMetronomeOverlay = React.lazy(() => import('./src/components/DigitalMetronomeOverlay'));
const LyricsTTSPlayer = React.lazy(() => import('./src/components/LyricsTTSPlayer'));
const LyricsVersionHistorySidebar = React.lazy(() => import('./src/components/LyricsVersionHistorySidebar'));
const ThematicHookGeneratorModal = React.lazy(() => import('./src/components/ThematicHookGeneratorModal'));
const MelodyGuidanceModal = React.lazy(() => import('./src/components/MelodyGuidanceModal'));
const ThemeLyricsGenerator = React.lazy(() => import('./src/components/ThemeLyricsGenerator'));
const ProductionLibraryView = React.lazy(() => import('./src/components/ProductionLibraryView'));
const StyleTemplatesLibraryView = React.lazy(() => import('./src/components/StyleTemplatesLibraryView'));
const AgentManagementView = React.lazy(() => import('./src/components/AgentManagementView'));
const SettingsModal = React.lazy(() => import('./src/components/SettingsModal'));
const AlbumSongsLibraryView = React.lazy(() => import('./src/components/AlbumSongsLibraryView'));
const AutonomousViralityAgentStudio = React.lazy(() => import('./src/components/AutonomousViralityAgentStudio'));
const LyricsDisplay = React.lazy(() => import('./src/components/LyricsDisplay'));
import { generateLyricsPdf } from './src/components/generateLyricsPdf';
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from './src/constants';

import {
  executeUniversalLLMCall,
  getStoredLLMModels,
  getActiveModelId,
  setActiveModelId
} from './src/agents/llmRegistry';
import { ai } from './src/aiShim';

// callUniversalAI / ai moved to src/aiShim.ts

// Song/Album/result types + LANGUAGES moved to src/types.ts

interface SongConfigurationCardProps {
  song: Song;
  albumGenres: string[];
  isLoading: boolean;
  stylePresets: StylePreset[];
  onUpdate: (songId: string, updatedData: Partial<Song>) => void;
  onRegenerateTitle: (songId: string) => void;
  onGenerateLyrics: (songId: string) => void;
  onApprove: (songId: string) => void;
  onSuggestIdeas: (songId: string) => void;
  onEnhanceIdeas: (songId: string) => void;
  onOpenEnhancer?: (line: string, songContext: any) => void;
  onOpenExportSheet?: (song: Song) => void;
}

// Occasion/genre constants moved to src/constants.ts

export { kbDB } from './src/kbDB';


// localStorage keys moved to src/types.ts


// LyricEnhancerModal moved to src/components/LyricEnhancerModal.tsx (code-split).
// GenreStyleAnalyzerModal moved to src/components/GenreStyleAnalyzerModal.tsx (code-split).
// CollaborativeLyricRoomModal moved to src/components/CollaborativeLyricRoomModal.tsx (code-split).
// ChordProgressionModal moved to src/components/ChordProgressionModal.tsx (code-split).
// SentimentAnalysisOverlay moved to src/components/SentimentAnalysisOverlay.tsx (code-split).
// DigitalMetronomeOverlay moved to src/components/DigitalMetronomeOverlay.tsx (code-split).
// LyricsTTSPlayer moved to src/components/LyricsTTSPlayer.tsx (code-split).
// LyricsVersionHistorySidebar moved to src/components/LyricsVersionHistorySidebar.tsx (code-split).
// ThematicHookGeneratorModal moved to src/components/ThematicHookGeneratorModal.tsx (code-split).
// MelodyGuidanceModal moved to src/components/MelodyGuidanceModal.tsx (code-split).
// ThemeLyricsGenerator moved to src/components/ThemeLyricsGenerator.tsx (code-split).
const SongConfigurationCard: React.FC<SongConfigurationCardProps> = ({ 
  song, 
  albumGenres, 
  isLoading,
  stylePresets,
  onUpdate, 
  onRegenerateTitle, 
  onGenerateLyrics, 
  onApprove, 
  onSuggestIdeas, 
  onEnhanceIdeas 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenreAnalyzerOpen, setIsGenreAnalyzerOpen] = useState(false);
  const [isCollabRoomOpen, setIsCollabRoomOpen] = useState(false);
  const [isHookModalOpen, setIsHookModalOpen] = useState(false);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [isMelodyModalOpen, setIsMelodyModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onUpdate(song.id, { [e.target.name]: e.target.value });
  };
  
  return (
    <div className={`bg-gray-800 p-4 sm:p-5 rounded-xl border mb-4 transition-all ${song.isApproved ? 'border-teal-500 bg-teal-950/20' : 'border-gray-700'}`}>
      <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center min-w-0 pr-4">
          {song.isApproved && <CheckmarkIcon />}
          <h4 className="font-bold text-lg text-white truncate">{song.title || `Untitled Song`}</h4>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-md hidden sm:block font-medium">{song.genre}</span>
          <span className="text-xs bg-teal-950/80 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded hidden md:block">{song.rhymeScheme || "ABAB"}</span>
          <button className="text-teal-400 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors">
            {isExpanded ? 'âˆ’' : '+'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700/80 space-y-4 animate-fade-in">
          {/* Song Title & Regenerate Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">
              Song Title <span className="text-gray-400 font-normal">(Editable)</span>
            </label>
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                name="title" 
                value={song.title} 
                onChange={handleChange} 
                placeholder="Song Title" 
                className="flex-grow bg-gray-700/80 text-white p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-semibold"
              />
              <button 
                type="button"
                disabled={isLoading}
                onClick={() => onRegenerateTitle(song.id)} 
                className={`text-xs px-3.5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isLoading 
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
                    : "bg-gray-700 hover:bg-gray-600 text-teal-300 border border-gray-600"
                }`}
              >
                âš¡ Suggest Viral Title
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Music Genre</label>
                <button
                  type="button"
                  onClick={() => setIsGenreAnalyzerOpen(true)}
                  className="text-[10px] text-teal-300 hover:text-teal-200 font-bold underline transition-colors cursor-pointer"
                >
                  ðŸ” Analyze DNA
                </button>
              </div>
              <select name="genre" value={song.genre} onChange={handleChange} className="w-full bg-gray-700/80 text-white p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm">
                <option value="">Select Genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">Rhyme Scheme</label>
              <select name="rhymeScheme" value={song.rhymeScheme || "ABAB (Alternate Rhyme)"} onChange={handleChange} className="w-full bg-gray-700/80 text-white p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm">
                {RHYME_SCHEMES.map(rs => <option key={rs} value={rs}>{rs}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">Emotional Mood</label>
              <input type="text" name="mood" value={song.mood} onChange={handleChange} placeholder="e.g. Euphoric" className="w-full bg-gray-700/80 text-white p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">Song Structure</label>
              <input type="text" name="structure" value={song.structure} onChange={handleChange} placeholder="Verse - Chorus - Bridge" className="w-full bg-gray-700/80 text-white p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">Artist / Style Preset (Optional)</label>
            <select name="stylePresetId" value={song.stylePresetId || ""} onChange={handleChange} className="w-full bg-gray-700/80 text-teal-300 p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm">
              <option value="">Standard Style</option>
              {stylePresets.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          {/* Style Reference Inputs (YouTube, Song Title, Artist) */}
          <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/80 space-y-3">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">ðŸŽ¨ Style Reference Inputs (Guide Cadence, Vocal Flow & Delivery)</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-gray-300 mb-1">ðŸŽ¥ YouTube Reference Link</label>
                <input
                  type="url"
                  name="youtubeStyleLink"
                  value={song.youtubeStyleLink || ""}
                  onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-800 text-white p-2 rounded-lg border border-gray-600 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-300 mb-1">ðŸŽµ Song Title to Style From</label>
                <input
                  type="text"
                  name="referenceSongTitle"
                  value={song.referenceSongTitle || ""}
                  onChange={handleChange}
                  placeholder="e.g., Blinding Lights"
                  className="w-full bg-gray-800 text-white p-2 rounded-lg border border-gray-600 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-300 mb-1">ðŸŽ¤ Artist Style Reference</label>
                <input
                  type="text"
                  name="artistStyleName"
                  value={song.artistStyleName || ""}
                  onChange={handleChange}
                  placeholder="e.g., The Weeknd / Taylor Swift"
                  className="w-full bg-gray-800 text-white p-2 rounded-lg border border-gray-600 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">Custom Ideas & Keywords</label>
            <textarea name="customIdeas" value={song.customIdeas} onChange={handleChange} placeholder="Custom ideas, keywords, or specific lyrics to include..." className="w-full bg-gray-700/80 text-white p-3 rounded-lg border border-gray-600 h-20 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"></textarea>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  type="button"
                  onClick={() => setIsHookModalOpen(true)} 
                  className="text-xs bg-amber-950/80 hover:bg-amber-900 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/40 font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Generate thematic hooks and opening lines tailored to this genre"
                >
                  <span>ðŸ’¡ Overcome Writer's Block (Hook)</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setIsArtworkModalOpen(true)} 
                  className="text-xs bg-pink-950/80 hover:bg-pink-900 text-pink-300 px-3 py-1.5 rounded-lg border border-pink-500/40 font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Generate custom AI vinyl cover art for this track"
                >
                  <span>ðŸŽ¨ AI Artwork</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setIsMelodyModalOpen(true)} 
                  className="text-xs bg-teal-950/80 hover:bg-teal-900 text-teal-300 px-3 py-1.5 rounded-lg border border-teal-500/40 font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Explore genre melody motifs, scale ladders, pitch contours & AI vocal arranger"
                >
                  <span>ðŸŽµ Melody & Motifs</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSuggestIdeas(song.id)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-md border border-gray-600 transition-all disabled:opacity-50"
                >
                  Suggest Ideas
                </button>
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={() => onEnhanceIdeas(song.id)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-md border border-gray-600 transition-all disabled:opacity-50"
                >
                  Enhance My Ideas
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-2 border-t border-gray-700/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                type="button"
                disabled={isLoading}
                onClick={() => onGenerateLyrics(song.id)} 
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                  isLoading 
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
                    : "bg-teal-600 hover:bg-teal-500 text-white shadow-md active:scale-95"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Generate 3 Lyric Versions</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsCollabRoomOpen(true)}
                className="px-3.5 py-2.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Open live multi-user co-writing room"
              >
                <span>ðŸ‘¥ Live Co-Write</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={() => onApprove(song.id)} 
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg transition-all text-sm font-semibold ${
                song.isApproved ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-md'
              }`}
            >
              {song.isApproved ? 'Unapprove Song' : 'Approve Song'}
            </button>
          </div>
          
          {song.lyrics && song.lyrics.length > 0 && (
            <React.Suspense fallback={null}>
              <LyricsDisplay
                lyrics={song.lyrics}
                songContext={{
                  title: song.title,
                  genre: song.genre,
                  mood: song.mood,
                  language: song.language
                }}
              />
            </React.Suspense>
          )}

          {/* Genre Analyzer Modal */}
          {isGenreAnalyzerOpen && (
            <React.Suspense fallback={null}>
              <GenreStyleAnalyzerModal
                isOpen={isGenreAnalyzerOpen}
                onClose={() => setIsGenreAnalyzerOpen(false)}
                currentGenre={song.genre}
                onSelectGenre={(g) => onUpdate(song.id, { genre: g })}
                onApplyPrompt={(promptText) => {
                  const currentIdeas = song.customIdeas ? `${song.customIdeas}\n${promptText}` : promptText;
                  onUpdate(song.id, { customIdeas: currentIdeas });
                }}
                onApplyVocabularyWord={(word) => {
                  const currentIdeas = song.customIdeas ? `${song.customIdeas}, ${word}` : word;
                  onUpdate(song.id, { customIdeas: currentIdeas });
                }}
              />
            </React.Suspense>
          )}

          {/* Live Co-Writing Studio Modal */}
          {isCollabRoomOpen && (
            <React.Suspense fallback={null}>
              <CollaborativeLyricRoomModal
                isOpen={isCollabRoomOpen}
                onClose={() => setIsCollabRoomOpen(false)}
                initialSong={song}
                onSaveToLocal={(newLyrics: string[][], newTitle?: string) => {
                  onUpdate(song.id, {
                    lyrics: newLyrics,
                    ...(newTitle ? { title: newTitle } : {})
                  });
                }}
              />
            </React.Suspense>
          )}

          {/* Thematic Hook Generator Modal (Overcoming Writer's Block) */}
          {isHookModalOpen && (
            <React.Suspense fallback={null}>
              <ThematicHookGeneratorModal
                isOpen={isHookModalOpen}
                onClose={() => setIsHookModalOpen(false)}
                initialGenre={song.genre || "Pop"}
                initialMood={song.mood || "Euphoric"}
                initialTheme={song.customIdeas || ""}
                songTitle={song.title}
                onApplyHook={(hookText: string) => {
                  const currentIdeas = song.customIdeas 
                    ? `${song.customIdeas}\n\n[Hook / Opening Idea]:\n${hookText}` 
                    : `[Hook / Opening Idea]:\n${hookText}`;
                  onUpdate(song.id, { customIdeas: currentIdeas });
                }}
              />
            </React.Suspense>
          )}

          {/* AI Album Artwork Studio Modal */}
          {isArtworkModalOpen && (
            <React.Suspense fallback={null}>
              <AIAlbumArtworkGeneratorModal
                isOpen={isArtworkModalOpen}
                onClose={() => setIsArtworkModalOpen(false)}
                songTitle={song.title || "Studio Track"}
                genre={song.genre || "Pop"}
                mood={song.mood || "Dynamic"}
                lyricsSnippet={song.lyrics?.[0]?.slice(0, 4)?.join('\n') || song.customIdeas || ""}
              />
            </React.Suspense>
          )}

          {/* Melody & Scale Motif Guidance Studio Modal */}
          {isMelodyModalOpen && (
            <React.Suspense fallback={null}>
              <MelodyGuidanceModal
                isOpen={isMelodyModalOpen}
                onClose={() => setIsMelodyModalOpen(false)}
                initialGenre={song.genre || "Pop"}
                initialMood={song.mood || "Euphoric"}
                songTitle={song.title}
                initialLyrics={song.lyrics?.[0]?.join('\n') || song.customIdeas || ""}
                onApplyMelodyNotes={(notesSummary: string) => {
                  const currentIdeas = song.customIdeas 
                    ? `${song.customIdeas}\n\n[Melodic Motif & Scale Guide]:\n${notesSummary}` 
                    : `[Melodic Motif & Scale Guide]:\n${notesSummary}`;
                  onUpdate(song.id, { customIdeas: currentIdeas });
                }}
              />
            </React.Suspense>
          )}
        </div>
      )}
    </div>
  );
};

import { exportAlbumToFile, exportSongsToFile } from './src/components/exportUtils';

// RecentStylesDropdown moved to src/components/RecentStylesDropdown.tsx (code-split).
// CompareDraftsModal moved to src/components/CompareDraftsModal.tsx (code-split).
// D3RadarChart moved to src/components/D3RadarChart.tsx (code-split).
// ProductionLibraryView moved to src/components/ProductionLibraryView.tsx (code-split).
// StyleTemplatesLibraryView moved to src/components/StyleTemplatesLibraryView.tsx (code-split).
// SettingsModal moved to src/components/SettingsModal.tsx (code-split).
// AlbumSongsLibraryView moved to src/components/AlbumSongsLibraryView.tsx (code-split).
// AutonomousViralityAgentStudio moved to src/components/AutonomousViralityAgentStudio.tsx (code-split).
// LyricsCompanionAgent moved to src/components/LyricsCompanionAgent.tsx (code-split).
const App = () => {
    const [activeTab, setActiveTab] = useState<'theme' | 'agent' | 'album' | 'albumSongs' | 'library' | 'templates' | 'agents'>('theme');
    const [selectedGlobalModelId, setSelectedGlobalModelId] = useState<string>(() => getActiveModelId());
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [album, setAlbum] = useState<Album | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("AI is thinking...");
    const [isFinalized, setIsFinalized] = useState(false);
    const [isAgentStudioOpen, setIsAgentStudioOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Theme Mode (Dark Studio vs High Contrast Light)
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
      try {
        const saved = localStorage.getItem("ai_lyrics_theme_mode");
        if (saved === 'light' || saved === 'dark') return saved;
      } catch (e) {
        console.error("Error loading theme mode:", e);
      }
      return 'dark';
    });

    // App Preferences
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      try {
        const saved = localStorage.getItem(LS_APP_SETTINGS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading app settings:", e);
      }
      return {
        autoSaveInterval: 3,
        defaultRhymeScheme: "ABAB (Alternate Rhyme)",
        lyricFontSize: 'base',
        exportFormat: 'txt'
      };
    });

    // Apply light-theme class to body
    useEffect(() => {
      if (typeof document !== 'undefined') {
        if (themeMode === 'light') {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }
      }
      localStorage.setItem("ai_lyrics_theme_mode", themeMode);
    }, [themeMode]);

    const handleToggleTheme = (mode: 'dark' | 'light') => {
      setThemeMode(mode);
    };

    const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
      setAppSettings(prev => {
        const updated = { ...prev, ...newSettings };
        localStorage.setItem(LS_APP_SETTINGS, JSON.stringify(updated));
        return updated;
      });
    };

    // State persisted in LocalStorage
    const [recentThemes, setRecentThemes] = useState<RecentTheme[]>([]);
    const [stylePresets, setStylePresets] = useState<StylePreset[]>(DEFAULT_STYLE_PRESETS);
    const [lastSavedTime, setLastSavedTime] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Digital Metronome, Version History & TTS Voice States
    const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
    const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
    const [isGlobalMelodyOpen, setIsGlobalMelodyOpen] = useState(false);
    const [ttsModalState, setTtsModalState] = useState<{ isOpen: boolean; lyrics: string; title: string }>({
      isOpen: false,
      lyrics: "",
      title: ""
    });
    const [versionHistory, setVersionHistory] = useState<LyricDraftVersion[]>(() => {
      try {
        const saved = localStorage.getItem("lyricist_version_history_v1");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading version history:", e);
      }
      return [];
    });

    const handleUpdateAlbum = useCallback((data: Partial<Album>) => {
        setAlbum(prev => prev ? { ...prev, ...data } : null);
    }, []);

    const handleUpdateSong = useCallback((songId: string, updatedData: Partial<Song>) => {
        // Derive from latest state, not the render-time snapshot, so rapid
        // successive updates can't overwrite each other.
        setAlbum(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                songs: prev.songs.map(song => song.id === songId ? { ...song, ...updatedData } : song)
            };
        });
    }, []);

    // Listen to history updates
    useEffect(() => {
      const handleHistoryUpdate = () => {
        try {
          const saved = localStorage.getItem("lyricist_version_history_v1");
          if (saved) setVersionHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading version history event:", e);
        }
      };
      window.addEventListener("lyrics_history_updated", handleHistoryUpdate);
      return () => window.removeEventListener("lyrics_history_updated", handleHistoryUpdate);
    }, []);

    const handleSaveVersionSnapshot = useCallback((lyricsText: string, title?: string, tag?: string) => {
      if (!lyricsText || !lyricsText.trim()) return;
      try {
        const newVer: LyricDraftVersion = {
          id: "ver-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          title: title || "Song Draft Snapshot",
          lyricsText: lyricsText,
          timestamp: Date.now(),
          tag: tag || "Manual Snapshot",
          wordCount: lyricsText.split(/\s+/).filter(Boolean).length,
          lineCount: lyricsText.split('\n').filter(Boolean).length,
          charCount: lyricsText.length
        };
        setVersionHistory(prev => {
          const updated = [newVer, ...prev].slice(0, 50);
          localStorage.setItem("lyricist_version_history_v1", JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        console.error("Error saving version snapshot", e);
      }
    }, []);

    const handleTakeManualSnapshot = useCallback(() => {
      // Find currently active lyrics
      let activeText = "";
      let activeTitle = "Active Draft";
      if (album && album.songs && album.songs.length > 0) {
        const songWithLyrics = album.songs.find(s => s.lyrics && s.lyrics.length > 0);
        if (songWithLyrics && songWithLyrics.lyrics) {
          activeText = songWithLyrics.lyrics[0]?.join('\n') || "";
          activeTitle = songWithLyrics.title;
        }
      }
      if (!activeText) {
        activeText = `[Verse 1]\nNeon lights in the twilight rain\nWalking through the memories and the phantom pain\n\n[Chorus]\nWe are the rhythm in the dark\nIgniting embers from a spark`;
      }
      handleSaveVersionSnapshot(activeText, activeTitle, "Studio Snapshot");
      alert(`Saved snapshot of "${activeTitle}" to Version History!`);
    }, [album, handleSaveVersionSnapshot]);

    // Keyboard shortcut: Ctrl/Cmd + S captures a Version History snapshot
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 's') {
          e.preventDefault();
          handleTakeManualSnapshot();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [handleTakeManualSnapshot]);

    const handleRevertVersion = useCallback((lyricsText: string, title?: string) => {
      if (album && album.songs && album.songs.length > 0) {
        const targetSongId = album.songs[0].id;
        const linesArray = lyricsText.split('\n');
        handleUpdateSong(targetSongId, {
          title: title || album.songs[0].title,
          lyrics: [linesArray, [...linesArray], [...linesArray]]
        });
        alert(`Restored lyrics into "${album.songs[0].title || 'Track 1'}" in your studio album!`);
      } else {
        navigator.clipboard.writeText(lyricsText);
        alert(`Reverted version copied to clipboard! You can paste it into any song editor.`);
      }
    }, [album, handleUpdateSong]);

    const handleDeleteVersion = useCallback((id: string) => {
      setVersionHistory(prev => {
        const updated = prev.filter(v => v.id !== id);
        localStorage.setItem("lyricist_version_history_v1", JSON.stringify(updated));
        return updated;
      });
    }, []);

    const handleClearHistory = useCallback(() => {
      setVersionHistory([]);
      localStorage.removeItem("lyricist_version_history_v1");
    }, []);

    const getCurrentActiveLyrics = useCallback(() => {
      if (album && album.songs) {
        for (const s of album.songs) {
          if (s.lyrics && s.lyrics.length > 0) {
            return s.lyrics[0].join('\n');
          }
        }
      }
      return "";
    }, [album]);

    // Load initial LocalStorage
    useEffect(() => {
      try {
        const savedRecent = localStorage.getItem(LS_RECENT_THEMES);
        if (savedRecent) {
          setRecentThemes(JSON.parse(savedRecent));
        }

        const savedPresets = localStorage.getItem(LS_STYLE_PRESETS);
        if (savedPresets) {
          setStylePresets(JSON.parse(savedPresets));
        }

        const savedAlbum = localStorage.getItem(LS_ALBUM_STATE);
        if (savedAlbum) {
          const parsedAlbumData = JSON.parse(savedAlbum);
          if (parsedAlbumData.album) {
            setAlbum(parsedAlbumData.album);
            if (parsedAlbumData.currentStep) setCurrentStep(parsedAlbumData.currentStep);
            if (parsedAlbumData.isFinalized !== undefined) setIsFinalized(parsedAlbumData.isFinalized);
            if (parsedAlbumData.activeTab) setActiveTab(parsedAlbumData.activeTab);
          }
        }

        const savedAppState = localStorage.getItem(LS_APP_STATE);
        if (savedAppState) {
          const parsedAppState = JSON.parse(savedAppState);
          if (parsedAppState.activeTab) setActiveTab(parsedAppState.activeTab);
        }
      } catch (e) {
        console.error("Error loading LocalStorage:", e);
      }
    }, []);

    // Save app state to LocalStorage
    const saveAppState = useCallback(() => {
      try {
        setIsSaving(true);
        if (album) {
          localStorage.setItem(LS_ALBUM_STATE, JSON.stringify({ album, currentStep, isFinalized, activeTab }));
        }
        localStorage.setItem(LS_APP_STATE, JSON.stringify({ activeTab }));
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setTimeout(() => setIsSaving(false), 500);
      } catch (e) {
        console.error("Error saving app state to LocalStorage:", e);
        setIsSaving(false);
      }
    }, [album, currentStep, isFinalized, activeTab]);

    // Save album & app state on state change
    useEffect(() => {
      saveAppState();
    }, [saveAppState]);

    // Auto-save periodically based on settings interval & on beforeunload
    useEffect(() => {
      const intervalMs = (appSettings.autoSaveInterval || 3) * 1000;
      const timer = setInterval(() => {
        saveAppState();
      }, intervalMs);

      const handleBeforeUnload = () => {
        saveAppState();
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        clearInterval(timer);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }, [saveAppState, appSettings.autoSaveInterval]);

    const handleSaveRecentTheme = useCallback((newItem: RecentTheme) => {
      setRecentThemes((prev) => {
        const filtered = prev.filter(t => t.theme.toLowerCase() !== newItem.theme.toLowerCase());
        const updated = [newItem, ...filtered].slice(0, 5);
        localStorage.setItem(LS_RECENT_THEMES, JSON.stringify(updated));
        return updated;
      });
    }, []);

    const handleAddStylePreset = useCallback((preset: StylePreset) => {
      setStylePresets((prev) => {
        const updated = [preset, ...prev];
        localStorage.setItem(LS_STYLE_PRESETS, JSON.stringify(updated));
        return updated;
      });
    }, []);

    const handleDeleteStylePreset = useCallback((id: string) => {
      setStylePresets((prev) => {
        const updated = prev.filter(p => p.id !== id);
        localStorage.setItem(LS_STYLE_PRESETS, JSON.stringify(updated));
        return updated;
      });
    }, []);

    const handleAddSongsToAlbum = useCallback((newSongs: Song[]) => {
      if (!album) {
        const newAlbum: Album = {
          id: `album-${Date.now()}`,
          name: "New Production Album",
          occasion: OCCASIONS[0],
          genres: newSongs[0]?.genre ? [newSongs[0].genre] : [GENRES[0]],
          songs: newSongs,
          songCount: newSongs.length,
          comments: "Generated with Virality Engine"
        };
        setAlbum(newAlbum);
        setCurrentStep(2);
        setActiveTab('album');
      } else {
        const existingIds = new Set(album.songs.map(s => s.id));
        const nonDuplicates = newSongs.filter(s => !existingIds.has(s.id));
        const updatedList = [...album.songs, ...nonDuplicates];
        handleUpdateAlbum({ songs: updatedList, songCount: updatedList.length });
        alert(`Added ${nonDuplicates.length} song(s) to album "${album.name}"!`);
      }
    }, [album, handleUpdateAlbum]);

    // Load album directly from Library view into the active Album Studio workspace
    const handleLoadAlbumIntoWorkspace = useCallback((loadedAlbum: Album) => {
      setAlbum(loadedAlbum);
      setCurrentStep(2);
      setIsFinalized(false);
      setActiveTab('album');
    }, []);

    const handleAddSongToActiveAlbum = useCallback((song: Song) => {
      if (!album) {
        const newAlbum: Album = {
          id: `album-${Date.now()}`,
          name: "Saved Songs Compilation",
          occasion: "General",
          comments: "Album created from library single tracks",
          genres: [song.genre || "Pop"],
          songs: [song],
          songCount: 1
        };
        setAlbum(newAlbum);
        setCurrentStep(2);
        setActiveTab('album');
      } else {
        const updatedSongs = [...album.songs, song];
        handleUpdateAlbum({ songs: updatedSongs, songCount: updatedSongs.length });
        alert(`Added "${song.title}" to active album "${album.name}"!`);
      }
    }, [album, handleUpdateAlbum]);

    const handleApplyTemplateToTheme = useCallback((template: ExtendedStyleTemplate) => {
      if (!stylePresets.some(p => p.id === template.id)) {
        handleAddStylePreset(template);
      }
      setActiveTab('theme');
    }, [stylePresets, handleAddStylePreset]);

    const handleApplyTemplateToAgent = useCallback((template: ExtendedStyleTemplate) => {
      if (!stylePresets.some(p => p.id === template.id)) {
        handleAddStylePreset(template);
      }
      setActiveTab('agent');
    }, [stylePresets, handleAddStylePreset]);

    const handleClearWorkspace = useCallback(() => {
      if (confirm("Are you sure you want to clear your active album and song workspace? This cannot be undone.")) {
        setAlbum(null);
        setCurrentStep(1);
        setIsFinalized(false);
        localStorage.removeItem(LS_ALBUM_STATE);
        setIsSettingsOpen(false);
        alert("Workspace reset successfully.");
      }
    }, []);
    
    const handleAlbumCreation = async (formData: Omit<Album, 'id' | 'songs'>) => {
        setIsLoading(true);
        setLoadingMessage("Reviewing album concept & automating viral song titles + track fields...");

        const modelId = getActiveModelId();
        const prompt = `You are a legendary creative record producer and album A&R.
Review this album concept and generate a complete, review-ready tracklist package.

Album Title: "${formData.name}"
Album Occasion / Theme: ${formData.occasion}
Album Description / Comments: "${formData.comments}"
Number of Songs Requested: ${formData.songCount}
User-selected genres (if any): ${formData.genres.join(', ') || '(none — you choose)'}

For EACH of the ${formData.songCount} tracks return:
1. "title" — viral, catchy, complete song title that rhymes with or plays on the album title/theme
2. "genre" — one genre from: ${GENRES.join(', ')}
3. "mood" — atmospheric mood (e.g. Euphoric & Festival, Melancholic & Reflective)
4. "structure" — song section map (e.g. Verse - Pre-Chorus - Chorus - Verse - Chorus - Bridge - Chorus)
5. "rhymeScheme" — e.g. AABB (Couplets), ABAB (Alternate Rhyme), ABCB (Ballad Stanza)
6. "musicKey" — suggested key (e.g. C Major, F# Minor)
7. "customIdeas" — one-sentence story/hook seed (under 14 words) for lyric generation
8. "titleRationale" — one short sentence on why this title fits the album narrative

Also return "albumGenres" — 2-4 genres that fit the full album arc.
Return ONLY valid JSON matching the schema. Do not invent extra tracks.`;

        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            albumGenres: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            tracks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        genre: { type: Type.STRING },
                                        mood: { type: Type.STRING },
                                        structure: { type: Type.STRING },
                                        rhymeScheme: { type: Type.STRING },
                                        musicKey: { type: Type.STRING },
                                        customIdeas: { type: Type.STRING },
                                        titleRationale: { type: Type.STRING }
                                    },
                                    required: ["title", "genre", "mood", "structure", "rhymeScheme", "musicKey", "customIdeas", "titleRationale"]
                                }
                            }
                        },
                        required: ["albumGenres", "tracks"]
                    }
                }
            });

            const aiResponse = safeExtractJSON(response.text, {} as any);
            const tracks: any[] = Array.isArray(aiResponse.tracks) ? aiResponse.tracks : [];
            const aiGenres: string[] = Array.isArray(aiResponse.albumGenres) ? aiResponse.albumGenres : [];
            const combinedGenres = [...new Set([...formData.genres, ...aiGenres])];

            const newSongs: Song[] = Array.from({ length: formData.songCount }, (_, i) => {
                const t = tracks[i] || {};
                return {
                    id: `song-${Date.now()}-${i}`,
                    title: (t.title && String(t.title).trim()) || `${formData.name} - Track ${i + 1}`,
                    genre: t.genre || combinedGenres[i % Math.max(combinedGenres.length, 1)] || GENRES[0],
                    rhymeScheme: t.rhymeScheme || "ABAB (Alternate Rhyme)",
                    customIdeas: t.customIdeas || '',
                    mood: t.mood || 'Melancholic & Reflective',
                    structure: t.structure || 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
                    musicKey: t.musicKey || 'C Major',
                    titleRationale: t.titleRationale || '',
                    tags: ['ai-title-automation', 'pending-review'],
                    lyrics: [],
                    isApproved: false,
                };
            });

            setAlbum({
                ...formData,
                id: `album-${Date.now()}`,
                genres: combinedGenres.length > 0 ? combinedGenres : formData.genres,
                songs: newSongs,
                titlesReadyForReview: tracks.length > 0,
                titlesGeneratedAt: Date.now()
            });
            setCurrentStep(2);
        } catch (error) {
            console.error("AI Album Creation Error:", error);
            const newSongs: Song[] = Array.from({ length: formData.songCount }, (_, i) => ({
                id: `song-${Date.now()}-${i}`,
                title: `Track ${i + 1}`,
                genre: formData.genres[0] || GENRES[0],
                rhymeScheme: "ABAB (Alternate Rhyme)",
                customIdeas: '',
                mood: 'Melancholic & Reflective',
                structure: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
                lyrics: [],
                isApproved: false,
            }));
            setAlbum({
                ...formData,
                id: `album-${Date.now()}`,
                genres: formData.genres.length > 0 ? formData.genres : [GENRES[0]],
                songs: newSongs,
                titlesReadyForReview: false,
                titlesGeneratedAt: Date.now()
            });
            setCurrentStep(2);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Automation workflow: generate complete song titles + related fields from
     * the album theme/context already on the workspace, then stage for review.
     */
    const handleAutomateAlbumTitles = async () => {
        if (!album) return;

        setIsLoading(true);
        setLoadingMessage(`Automating titles & track fields for "${album.name}"…`);

        const modelId = getActiveModelId();
        const existingTitles = album.songs.map(s => s.title).filter(Boolean).join('; ');
        const prompt = `You are an album A&R automation engine.
Using ONLY this album context, generate a complete review-ready tracklist.

Album Title: "${album.name}"
Occasion / Theme: ${album.occasion}
Story / Comments: "${album.comments}"
Track count: ${album.songs.length}
Preferred genres: ${album.genres.join(', ') || '(choose fitting genres)'}
Current titles (may be placeholders — replace with stronger viral titles when useful): ${existingTitles || '(none)'}

For EACH track index 1..${album.songs.length} produce a full package:
- title (complete, viral, theme-connected)
- genre
- mood
- structure
- rhymeScheme
- musicKey
- customIdeas (lyric seed, ≤14 words)
- titleRationale (why it belongs on this album)

Return JSON: { "albumGenres": string[], "tracks": [...] } with exactly ${album.songs.length} tracks.`;

        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            albumGenres: { type: Type.ARRAY, items: { type: Type.STRING } },
                            tracks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        genre: { type: Type.STRING },
                                        mood: { type: Type.STRING },
                                        structure: { type: Type.STRING },
                                        rhymeScheme: { type: Type.STRING },
                                        musicKey: { type: Type.STRING },
                                        customIdeas: { type: Type.STRING },
                                        titleRationale: { type: Type.STRING }
                                    },
                                    required: ["title", "genre", "mood", "structure", "rhymeScheme", "musicKey", "customIdeas", "titleRationale"]
                                }
                            }
                        },
                        required: ["albumGenres", "tracks"]
                    }
                }
            });

            const data = safeExtractJSON(response.text, {} as any);
            const tracks: any[] = Array.isArray(data.tracks) ? data.tracks : [];
            if (tracks.length === 0) {
                alert("AI returned no track packages. Check your model connection in Settings, then try again.");
                return;
            }

            const aiGenres: string[] = Array.isArray(data.albumGenres) ? data.albumGenres : [];
            const combinedGenres = album.genres.length
                ? [...new Set([...album.genres, ...aiGenres])]
                : (aiGenres.length ? aiGenres : album.genres);

            const updatedSongs: Song[] = album.songs.map((song, i) => {
                const t = tracks[i] || {};
                return {
                    ...song,
                    title: (t.title && String(t.title).trim()) || song.title,
                    genre: t.genre || song.genre || combinedGenres[i % Math.max(combinedGenres.length, 1)] || GENRES[0],
                    mood: t.mood || song.mood,
                    structure: t.structure || song.structure,
                    rhymeScheme: t.rhymeScheme || song.rhymeScheme,
                    musicKey: t.musicKey || song.musicKey || 'C Major',
                    customIdeas: t.customIdeas || song.customIdeas,
                    titleRationale: t.titleRationale || song.titleRationale || '',
                    tags: [...new Set([...(song.tags || []).filter((tg: string) => tg !== 'pending-review'), 'ai-title-automation', 'pending-review'])],
                    isApproved: false,
                };
            });

            handleUpdateAlbum({
                songs: updatedSongs,
                genres: combinedGenres.length ? combinedGenres : album.genres,
                titlesReadyForReview: true,
                titlesGeneratedAt: Date.now()
            });
            setCurrentStep(2);
            setIsFinalized(false);
        } catch (error) {
            console.error("Album title automation error:", error);
            alert("Title automation failed. Check model API settings and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    /** Mark AI-generated tracklist as reviewed — clear pending flags, keep user edits. */
    const handleMarkTitlesReviewed = () => {
        if (!album) return;
        const songs = album.songs.map(s => ({
            ...s,
            tags: (s.tags || []).filter(t => t !== 'pending-review')
        }));
        handleUpdateAlbum({ songs, titlesReadyForReview: false });
        alert(`Tracklist marked reviewed (${songs.length} titles). Generate lyrics or finalize the album next.`);
    };

    const handleApproveAllTitlePackages = () => {
        if (!album) return;
        const songs = album.songs.map(s => ({
            ...s,
            isApproved: true,
            tags: (s.tags || []).filter(t => t !== 'pending-review').concat('title-approved')
        }));
        handleUpdateAlbum({ songs, titlesReadyForReview: false });
    };

    const handleGenerateViralAlbumTitles = async () => {
        if (!album) return;

        setIsLoading(true);
        setLoadingMessage(`Reviewing "${album.name}" to generate viral rhyming song titles...`);

        const modelId = getActiveModelId();
        const prompt = `You are a viral music branding consultant.
Review this album concept and suggest new viral, catchy song titles for each track that cleverly rhyme or play on words with the album title and theme.

Album Title: "${album.name}"
Album Theme / Occasion: ${album.occasion}
Album Description / Comments: "${album.comments}"
Number of Tracks: ${album.songs.length}

Generate ${album.songs.length} viral, rhyming, catchy song titles.
Adhere strictly to JSON schema: {"viralSongTitles": ["Title 1", "Title 2", ...]}
`;

        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            viralSongTitles: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["viralSongTitles"]
                    }
                }
            });

            const result = safeExtractJSON(response.text, { viralSongTitles: [] as string[] });
            let titles: string[] = Array.isArray(result.viralSongTitles) ? result.viralSongTitles : [];

            // Fallback: parse plain text line by line if JSON extraction was empty
            if (titles.length === 0 && response.text) {
                const lines = response.text
                    .split("\n")
                    .map((l) => l.replace(/^[\d\.\-\*\s"']+|["'\s]+$/g, "").trim())
                    .filter((l) => l.length > 2 && !l.startsWith("[PROCEDURAL"));
                if (lines.length > 0) {
                    titles = lines;
                }
            }

            if (titles.length > 0) {
                const updatedSongs = album.songs.map((song, i) => ({
                    ...song,
                    title: titles[i] || song.title,
                    tags: [...new Set([...(song.tags || []).filter((tg: string) => tg !== 'pending-review'), 'pending-review'])]
                }));
                handleUpdateAlbum({ songs: updatedSongs, titlesReadyForReview: true, titlesGeneratedAt: Date.now() });
            } else {
                alert("AI model returned no valid song titles. Please try again or test your AI provider in Settings.");
            }
        } catch (error) {
            console.error("Error generating viral album titles:", error);
            alert("Error regenerating song titles. Check model API connections in Settings.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegenerateTitle = async (songId: string) => {
        if (!album) return;
        const song = album.songs.find(s => s.id === songId);
        if (!song) return;

        setIsLoading(true);
        setLoadingMessage("Generating a viral rhyming title...");
        
        const prompt = `You are a viral music branding consultant.
Generate a single, catchy, viral song title that cleverly rhymes or plays on words with the album concept.
Album Title: "${album.name}"
Album Description: "${album.comments}"
Song Genre: ${song.genre}
Song Mood: ${song.mood}
Song Rhyme Scheme: ${song.rhymeScheme}
Song Ideas: ${song.customIdeas}
Current Title: "${song.title}"

Return ONLY the plain song title text. Do NOT include markdown bolding, quotes, bullets, or intro text.
`;
        try {
            const response = await ai.models.generateContent({
                model: getActiveModelId(),
                contents: prompt,
            });
            let cleanTitle = response.text || "";
            if (cleanTitle.includes("\n\n") && cleanTitle.startsWith("[PROCEDURAL")) {
                const parts = cleanTitle.split("\n\n");
                cleanTitle = parts[parts.length - 1];
            }
            cleanTitle = cleanTitle.replace(/^[\d\.\-\*\s"']+|["'\s]+$/g, "").replace(/\*\*/g, "").trim();
            if (cleanTitle.length > 0) {
                handleUpdateSong(songId, { title: cleanTitle });
            } else {
                alert("AI returned an empty response. Please try clicking '⚡ Suggest Viral Title' again.");
            }
        } catch (error) {
            console.error("Error regenerating title:", error);
            alert("Error generating viral title. Please check model settings in Settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateLyrics = async (songId: string) => {
        if (!album) return;
        const song = album.songs.find(s => s.id === songId);
        if (!song) return;
    
        setIsLoading(true);
        setLoadingMessage(`Generating lyric versions for "${song.title}" (${song.rhymeScheme || 'ABAB'})...`);
    
        const activePreset = stylePresets.find(p => p.id === song.stylePresetId);
        let presetPrompt = "";
        if (activePreset) {
          presetPrompt = `Lyric Style Reference Preset: "${activePreset.name}" - ${activePreset.description}. Cadence: ${activePreset.cadenceAndMeter}. Rhyme Density: ${activePreset.rhymeDensity}.`;
        }

        const prompt = `You are an expert hitmaker lyricist. Write lyrics for a song with the following details.

Album Name: "${album.name}"
Album Occasion/Theme: ${album.occasion} (${album.comments})

Song Title: "${song.title}"
Song Genre: ${song.genre}
Rhyme Scheme Requirement: Strictly follow ${song.rhymeScheme || 'ABAB (Alternate Rhyme)'} rhyme scheme for stanzas.
Emotional Mood/Vibe: ${song.mood}
Desired Structure: ${song.structure}
Key Ideas/Keywords from user: "${song.customIdeas}"
${presetPrompt}

Instructions:
1. Generate THREE distinct versions of the lyrics for this song.
2. Follow the requested ${song.rhymeScheme || 'ABAB'} rhyme scheme for verses and choruses.
3. Incorporate the requested emotional tone "${song.mood}".
4. Format section headers in markdown like [Verse 1], [Chorus], [Bridge], [Outro].
5. Adhere strictly to JSON schema: {"lyricVersions": [["Line 1", "Line 2"], ["Version 2 Line 1"], ["Version 3 Line 1"]]}
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
                            lyricVersions: {
                                description: "An array containing distinct lyric versions (each version is an array of line strings).",
                                type: Type.ARRAY,
                                items: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                }
                            }
                        },
                        required: ["lyricVersions"]
                    }
                }
            });
            
            const result = safeExtractJSON(response.text, {} as any);
            let versions: string[][] = [];

            if (Array.isArray(result.lyricVersions) && result.lyricVersions.length > 0) {
                versions = result.lyricVersions.map((v: any) => {
                    if (Array.isArray(v)) {
                        return v.map(line => String(line));
                    }
                    if (typeof v === "string") {
                        return v.split("\n");
                    }
                    return [];
                }).filter((v: string[]) => v.length > 0);
            }

            // Fallback: if JSON parsing/extraction returned no versions array, parse raw text into lines
            if (versions.length === 0 && response.text) {
                const textWithoutHeader = response.text.includes("\n\n") && response.text.startsWith("[PROCEDURAL")
                    ? response.text.substring(response.text.indexOf("\n\n") + 2).trim()
                    : response.text.trim();
                const lines = textWithoutHeader.split("\n");
                if (lines.length > 0) {
                    versions = [lines];
                }
            }

            if (versions.length > 0) {
                handleUpdateSong(songId, { lyrics: versions });
            } else {
                alert("The AI response did not contain usable lyrics. Please verify your model API settings in Settings.");
            }
        } catch (error) {
            console.error("Error generating lyrics:", error);
            alert("Sorry, there was an error generating lyrics. Please try again or test your AI provider in Settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveSong = (songId: string) => {
        if (!album) return;
        const song = album.songs.find(s => s.id === songId);
        if(song) {
            handleUpdateSong(songId, { isApproved: !song.isApproved });
        }
    }
    
    const handleAIFill = async (songId: string, mode: 'suggest' | 'enhance') => {
        if (!album) return;
        const song = album.songs.find(s => s.id === songId);
        if (!song) return;
        
        setIsLoading(true);
        setLoadingMessage(mode === 'suggest' ? "Suggesting song ideas..." : "Enhancing your ideas...");
        
        const prompt = mode === 'suggest' 
            ? `Suggest creative keywords, imagery hooks, and story concepts for a song titled "${song.title}" in the ${song.genre} genre, for an album about ${album.occasion}. The mood is ${song.mood}.`
            : `Take these user ideas and enhance them, making them more poetic and lyrical for a song: "${song.customIdeas}". The song is titled "${song.title}" in the ${song.genre} genre. The mood is ${song.mood}.`;

        try {
            const response = await ai.models.generateContent({ model: getActiveModelId(), contents: prompt });
            let cleanText = response.text || "";
            if (cleanText.includes("\n\n") && cleanText.startsWith("[PROCEDURAL")) {
                cleanText = cleanText.substring(cleanText.indexOf("\n\n") + 2).trim();
            }
            cleanText = cleanText.replace(/\*\*/g, "").trim();
            if (cleanText.length > 0) {
                handleUpdateSong(songId, { customIdeas: cleanText });
            } else {
                alert("AI returned empty text for ideas. Please try again.");
            }
        } catch (error) {
            console.error(`Error in AI Fill (${mode}):`, error);
            alert(`Failed to ${mode} ideas. Check your model API settings in Settings.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${themeMode === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-gray-900 text-gray-100'} pb-16 font-sans transition-colors duration-200`}>
            {isLoading && <Spinner message={loadingMessage} />}
            
            <AgentOrchestratorStudioModal
              isOpen={isAgentStudioOpen}
              onClose={() => setIsAgentStudioOpen(false)}
              activeSongContext={{
                id: album?.songs?.[0]?.id || "active-song",
                title: album?.songs?.[0]?.title || "Studio Anthem",
                genre: album?.genres?.[0] || "Pop",
                mood: album?.songs?.[0]?.mood || "Euphoric",
                key: album?.songs?.[0]?.musicKey || "C Major",
                lyrics: album?.songs?.[0]?.lyrics,
                customIdeas: album?.songs?.[0]?.customIdeas
              }}
              onApplySongUpdate={(update) => {
                if (!album || !album.songs || album.songs.length === 0) {
                  return false;
                }
                const songId = album.songs[0].id;
                handleUpdateSong(songId, {
                  title: update.title || album.songs[0].title,
                  // Song.lyrics is string[][] — one wrap per version
                  lyrics: update.lyricsText ? [update.lyricsText.split('\n')] : album.songs[0].lyrics,
                  genre: update.genre || album.songs[0].genre,
                  mood: update.mood || album.songs[0].mood,
                  musicKey: update.key || album.songs[0].musicKey || "C Major",
                  customIdeas: update.customIdeas || album.songs[0].customIdeas
                });
                return true;
              }}
            />

            <React.Suspense fallback={null}>
              <ProductionApiModal
                isOpen={isApiModalOpen}
                onClose={() => setIsApiModalOpen(false)}
                activeModelId={selectedGlobalModelId}
              />
            </React.Suspense>

            <React.Suspense fallback={null}>
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                themeMode={themeMode}
                onToggleTheme={handleToggleTheme}
                settings={appSettings}
                onUpdateSettings={handleUpdateSettings}
                onClearWorkspace={handleClearWorkspace}
              />
            </React.Suspense>

            {/* Header */}
            <header className={`border-b ${themeMode === 'light' ? 'border-slate-300 bg-white/95' : 'border-gray-800 bg-gray-900/90'} backdrop-blur sticky top-0 z-50 transition-colors`}>
                <div className="container mx-auto px-4 py-3.5 flex flex-col xl:flex-row items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-gray-900 font-bold text-xl shadow-lg">
                                ðŸŽµ
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-black tracking-tight text-white">AI Lyric Generator</h1>
                                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-800/90 border border-gray-700/80 rounded-full text-[11px] font-medium text-gray-300">
                                        <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-ping' : 'bg-teal-400'}`}></span>
                                        <span className="text-teal-300 font-mono text-[10px]">
                                            {isSaving ? "Auto-saving..." : lastSavedTime ? `Auto-saved ${lastSavedTime}` : "Auto-save active"}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-teal-400 font-medium">Co-create custom song lyrics, albums & hit styles</p>
                            </div>
                        </div>

                        {/* Mobile Quick Action Buttons */}
                        <div className="flex items-center gap-1.5 xl:hidden flex-wrap">
                            <button
                                onClick={() => setIsMetronomeOpen(true)}
                                className="p-2 rounded-xl bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer"
                                title="Digital Metronome"
                            >
                                â±ï¸
                            </button>
                            <button
                                onClick={() => setIsVersionHistoryOpen(true)}
                                className="p-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer relative"
                                title="Lyrics Version History"
                            >
                                ðŸ•’
                                {versionHistory.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-teal-500 text-gray-950 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                        {versionHistory.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    const cur = getCurrentActiveLyrics();
                                    setTtsModalState({ isOpen: true, lyrics: cur, title: album?.name || "Studio Lyrics" });
                                }}
                                className="p-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer"
                                title="Vocalize Lyrics (TTS)"
                            >
                                ðŸ”Š
                            </button>
                            <button
                                onClick={() => handleToggleTheme(themeMode === 'dark' ? 'light' : 'dark')}
                                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-teal-300 border border-gray-700 text-xs font-bold transition-all cursor-pointer"
                                title={`Switch to ${themeMode === 'dark' ? 'High Contrast Light Mode' : 'Dark Studio Mode'}`}
                            >
                                {themeMode === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™'}
                            </button>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-bold transition-all cursor-pointer"
                                title="Settings"
                            >
                                âš™ï¸
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs Bar */}
                    <div className="flex flex-wrap items-center justify-center gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700/80 shadow-md">
                        <button
                            onClick={() => setActiveTab('theme')}
                            title="Generate instant song theme ideas, imagery hooks, and mood concepts"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'theme'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>âœ¨ Quick Theme</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('agent')}
                            title="Autonomous Hit Lyric Engine with global trend research, 4-critic loop, and interactive chat co-pilot"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'agent'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>ðŸš€ Virality Agent</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('album')}
                            title="Create full multi-track concept albums with narrative story arcs across tracks"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'album'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>ðŸ’¿ Album Studio</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('albumSongs')}
                            title="View, edit, and re-instruct lyrics for all songs in your album tracklist"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'albumSongs'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>ðŸŽµ Album Songs ({album?.songs?.length || 0})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('library')}
                            title="Centralized Library: Browse saved albums, songs, D3 emotional radar chart, and AI tagger"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'library'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>ðŸ“š Library & Analytics</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            title="Style Templates: Save and reuse proven prompt configurations, rhyme schemes, and artist styles"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'templates'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>🎨 Style Templates</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('agents')}
                            title="Agent Management: View all agents, descriptions, skills and tools — edit or create specialists"
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'agents'
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <span>👥 Agents</span>
                        </button>
                    </div>

                    {/* Right Action Icons (Desktop) */}
                    <div className="hidden xl:flex items-center gap-2">
                        {/* Metronome Tool */}
                        <button
                            onClick={() => setIsMetronomeOpen(true)}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-teal-300 hover:text-white bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            title="Open interactive Digital Metronome overlay"
                        >
                            <span>â±ï¸ Metronome</span>
                        </button>

                        {/* Melody & Scale Motif Guide */}
                        <button
                            onClick={() => setIsGlobalMelodyOpen(true)}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-teal-300 hover:text-white bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            title="Open Genre Melody Motifs & Scale Guidance Studio"
                        >
                            <span>ðŸŽµ Melody Guide</span>
                        </button>

                        {/* Version History Tool */}
                        <button
                            onClick={() => setIsVersionHistoryOpen(true)}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 relative"
                            title="View past lyrics drafts and 1-click revert"
                        >
                            <span>ðŸ•’ Drafts ({versionHistory.length})</span>
                            {versionHistory.length > 0 && (
                                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                            )}
                        </button>

                        {/* Voice Flow (TTS) */}
                        <button
                            onClick={() => {
                                const cur = getCurrentActiveLyrics();
                                setTtsModalState({
                                    isOpen: true,
                                    lyrics: cur || "[Verse 1]\nListening to the cadence and the flow\nSinging every harmony we know",
                                    title: album?.name || "Active Workspace Track"
                                });
                            }}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-purple-300 hover:text-white bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            title="Narrate lyrics aloud with voice synthesis"
                        >
                            <span>ðŸ”Š Voice (TTS)</span>
                        </button>

                        {/* Theme Toggle Button */}
                        <button
                            onClick={() => handleToggleTheme(themeMode === 'dark' ? 'light' : 'dark')}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-teal-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
                            title={`Switch to ${themeMode === 'dark' ? 'High Contrast Light Mode' : 'Dark Studio Mode'}`}
                        >
                            <span>{themeMode === 'dark' ? 'â˜€ï¸ Light Mode' : 'ðŸŒ™ Dark Mode'}</span>
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Settings & Preferences"
                        >
                            <span>âš™ï¸ Settings</span>
                        </button>

                        {/* Global Model Selector Dropdown */}
                        <div className="flex items-center gap-1.5 bg-gray-900 border border-teal-500/40 px-2.5 py-1.5 rounded-xl text-xs">
                            <span className="text-teal-400 font-bold">ðŸ§  Model:</span>
                            <select
                                value={selectedGlobalModelId}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    setSelectedGlobalModelId(newId);
                                    setActiveModelId(newId);
                                }}
                                className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-teal-400 cursor-pointer font-medium"
                                title="Switch active LLM model (Gemini, Claude 3.7, GPT-4o, DeepSeek, Groq, Ollama)"
                            >
                                {getStoredLLMModels().map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name.split('(')[0].trim()} ({m.provider})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Production API Docs Button */}
                        <button
                            onClick={() => setIsApiModalOpen(true)}
                            title="Production REST API: Endpoints, OpenAPI 3.0 schema, and cURL / Python / TypeScript SDK code"
                            className="px-3 py-2 text-xs font-bold rounded-xl text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        >
                            <span>ðŸŒ REST API</span>
                        </button>

                        {/* Agent Orchestrator Button */}
                        <button
                            onClick={() => setIsAgentStudioOpen(true)}
                            title="Multi-Agent Orchestrator Studio: Autonomous pipelines, live Writer's Room debate, custom agent builder & LLM registry"
                            className="px-3 py-2 text-xs font-bold rounded-xl text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        >
                            <span>âš¡ Agent Studio</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 pt-8 max-w-6xl">
                <React.Suspense fallback={<div className="text-center text-gray-400 py-16 text-sm">Loading view…</div>}>
                {activeTab === 'theme' ? (
                    <ThemeLyricsGenerator
                      recentThemes={recentThemes}
                      stylePresets={stylePresets}
                      onSaveRecentTheme={handleSaveRecentTheme}
                      onOpenAgentStudio={() => setIsAgentStudioOpen(true)}
                    />
                ) : activeTab === 'agent' ? (
                    <AutonomousViralityAgentStudio
                      stylePresets={stylePresets}
                      album={album}
                      onUpdateAlbum={handleUpdateAlbum}
                      onAddSongsToAlbum={handleAddSongsToAlbum}
                      onOpenAgentStudio={() => setIsAgentStudioOpen(true)}
                    />
                ) : activeTab === 'albumSongs' ? (
                    <AlbumSongsLibraryView
                      album={album}
                      onUpdateAlbum={handleUpdateAlbum}
                      onUpdateSong={handleUpdateSong}
                      onAddSongsToAlbum={handleAddSongsToAlbum}
                    />
                ) : activeTab === 'library' ? (
                    <ProductionLibraryView
                      currentAlbum={album}
                      onLoadAlbumIntoWorkspace={handleLoadAlbumIntoWorkspace}
                      onAddSongToActiveAlbum={handleAddSongToActiveAlbum}
                    />
                ) : activeTab === 'templates' ? (
                    <StyleTemplatesLibraryView
                      onApplyTemplateToTheme={handleApplyTemplateToTheme}
                      onApplyTemplateToAgent={handleApplyTemplateToAgent}
                    />
                ) : activeTab === 'agents' ? (
                    <AgentManagementView onOpenAgentStudio={() => setIsAgentStudioOpen(true)} />
                ) : (
                    <div>
                        {currentStep === 1 && <AlbumCreationStep onSubmit={handleAlbumCreation} isLoading={isLoading} />}
                        {currentStep === 2 && album && (
                            isFinalized
                                ? <FinalizedAlbumView album={album} onReEdit={() => setIsFinalized(false)} />
                                : <SongConfigurationStep
                                    album={album}
                                    isLoading={isLoading}
                                    stylePresets={stylePresets}
                                    onUpdateSong={handleUpdateSong}
                                    onRegenerateTitle={handleRegenerateTitle}
                                    onGenerateViralAlbumTitles={handleGenerateViralAlbumTitles}
                                    onAutomateTitles={handleAutomateAlbumTitles}
                                    onMarkTitlesReviewed={handleMarkTitlesReviewed}
                                    onApproveAllTitles={handleApproveAllTitlePackages}
                                    onGenerateLyrics={handleGenerateLyrics}
                                    onApproveSong={handleApproveSong}
                                    onSuggestIdeas={(songId) => handleAIFill(songId, 'suggest')}
                                    onEnhanceIdeas={(songId) => handleAIFill(songId, 'enhance')}
                                    onFinalize={() => setIsFinalized(true)}
                                  />
                        )}
                    </div>
                )}
                </React.Suspense>
            </main>

            {/* Persistent Floating Studio Action Bar (Bottom-Left) */}
            <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 bg-gray-950/90 border border-gray-800 p-2 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
                <button
                    onClick={() => setIsMetronomeOpen(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isMetronomeOpen
                            ? "bg-teal-500 text-gray-950 shadow-md font-black"
                            : "bg-gray-900 text-teal-300 hover:bg-gray-800 border border-teal-500/30"
                    }`}
                    title="Toggle Floating Metronome"
                >
                    <span>â±ï¸ Metronome</span>
                </button>

                <button
                    onClick={() => setIsGlobalMelodyOpen(true)}
                    className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Open Melody & Scale Motif Guide"
                >
                    <span>ðŸŽµ Melody</span>
                </button>

                <button
                    onClick={() => setIsVersionHistoryOpen(true)}
                    className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Open Lyrics Version History Sidebar"
                >
                    <span>ðŸ•’ History ({versionHistory.length})</span>
                </button>

                <button
                    onClick={() => {
                        const cur = getCurrentActiveLyrics();
                        setTtsModalState({
                            isOpen: true,
                            lyrics: cur || "[Verse 1]\nListening to the cadence and the flow\nSinging every harmony we know",
                            title: album?.name || "Active Track"
                        });
                    }}
                    className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hidden sm:flex"
                    title="Vocalize Active Lyrics with TTS"
                >
                    <span>ðŸ”Š Voice TTS</span>
                </button>

                <button
                    onClick={() => {
                        const cur = getCurrentActiveLyrics();
                        generateLyricsPdf({
                            title: album?.name || "Song Lyrics & Chords Lead Sheet",
                            genre: album?.genres?.[0] || "Pop",
                            lyricsText: cur || "[Verse 1]\nStrumming chords and feeling the melody\nWriting every lyric from the soul"
                        });
                    }}
                    className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hidden md:flex"
                    title="Export Instant PDF Lead Sheet"
                >
                    <span>ðŸ“„ PDF</span>
                </button>
            </div>

            {/* Overlays */}
            <React.Suspense fallback={null}>
              <DigitalMetronomeOverlay
                  isOpen={isMetronomeOpen}
                  onClose={() => setIsMetronomeOpen(false)}
              />
            </React.Suspense>

            <React.Suspense fallback={null}>
              <LyricsVersionHistorySidebar
                  isOpen={isVersionHistoryOpen}
                  onClose={() => setIsVersionHistoryOpen(false)}
                  versionHistory={versionHistory}
                  onRevert={handleRevertVersion}
                  onTakeSnapshot={handleTakeManualSnapshot}
                  onDeleteVersion={handleDeleteVersion}
                  onClearHistory={handleClearHistory}
                  currentLyrics={getCurrentActiveLyrics()}
              />
            </React.Suspense>

            <React.Suspense fallback={null}>
              <LyricsTTSPlayer
                  isOpen={ttsModalState.isOpen}
                  onClose={() => setTtsModalState(prev => ({ ...prev, isOpen: false }))}
                  lyricsText={ttsModalState.lyrics}
                  songTitle={ttsModalState.title}
              />
            </React.Suspense>

            {/* Global Melody & Scale Motif Guide Modal */}
            {isGlobalMelodyOpen && (
                <React.Suspense fallback={null}>
                  <MelodyGuidanceModal
                      isOpen={isGlobalMelodyOpen}
                      onClose={() => setIsGlobalMelodyOpen(false)}
                      initialGenre={album?.genres?.[0] || "Pop"}
                      initialMood="Euphoric & Energetic"
                      songTitle={album?.name || "Active Workspace Track"}
                      initialLyrics={getCurrentActiveLyrics()}
                  />
                </React.Suspense>
            )}
        </div>
    );
};

const AlbumCreationStep = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) => {
    const [formData, setFormData] = useState({
        name: '',
        occasion: OCCASIONS[0],
        comments: '',
        genres: [] as string[],
        songCount: 7,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'songCount' ? parseInt(value, 10) : value,
        }));
    };

    const handleGenreToggle = (genre: string) => {
        setFormData(prev => {
            const newGenres = prev.genres.includes(genre)
                ? prev.genres.filter(g => g !== genre)
                : [...prev.genres, genre];
            return { ...prev, genres: newGenres };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700 animate-fade-in shadow-xl">
            <h2 className="text-2xl font-bold mb-2 text-center text-white">Create a New Concept Album</h2>
            <p className="text-center text-gray-400 text-sm mb-6">Set the album theme — AI will auto-generate complete song titles and related track fields, ready for your review.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
                 <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Album Title (e.g., Midnight Confessions)" required className="w-full bg-gray-900 p-3.5 rounded-xl border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-semibold"/>
                 <select name="occasion" value={formData.occasion} onChange={handleChange} className="w-full bg-gray-900 p-3.5 rounded-xl border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm">
                    {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Album Description or Story Concept (AI will review this to generate viral rhyming song titles)..." className="w-full bg-gray-900 p-3.5 rounded-xl border border-gray-700 text-white h-24 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm leading-relaxed"></textarea>
                
                <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-gray-300">Select Primary Genres</label>
                    <div className="flex flex-wrap gap-2">
                        {GENRES.map(genre => (
                            <button key={genre} type="button" onClick={() => handleGenreToggle(genre)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${formData.genres.includes(genre) ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="songCount" className="block mb-2 text-xs font-semibold uppercase tracking-wider text-gray-300">Number of Songs: <span className="text-teal-400 text-sm">{formData.songCount}</span></label>
                    <input type="range" id="songCount" name="songCount" min="1" max="15" value={formData.songCount} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"/>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isLoading 
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                      : "bg-teal-600 hover:bg-teal-500 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Album...</span>
                    </>
                  ) : (
                    <span>Create Album → Auto Titles + Fields → Review</span>
                  )}
                </button>
            </form>
        </div>
    );
};

interface SongConfigurationStepProps {
    album: Album;
    isLoading: boolean;
    stylePresets: StylePreset[];
    onUpdateSong: (songId: string, updatedData: Partial<Song>) => void;
    onRegenerateTitle: (songId: string) => void;
    onGenerateViralAlbumTitles: () => void;
    onAutomateTitles?: () => void;
    onMarkTitlesReviewed?: () => void;
    onApproveAllTitles?: () => void;
    onGenerateLyrics: (songId: string) => void;
    onApproveSong: (songId: string) => void;
    onSuggestIdeas: (songId: string) => void;
    onEnhanceIdeas: (songId: string) => void;
    onFinalize: () => void;
}
const SongConfigurationStep = ({ album, isLoading, stylePresets, onUpdateSong, onRegenerateTitle, onGenerateViralAlbumTitles, onAutomateTitles, onMarkTitlesReviewed, onApproveAllTitles, onGenerateLyrics, onApproveSong, onSuggestIdeas, onEnhanceIdeas, onFinalize }: SongConfigurationStepProps) => (
    <div className="animate-fade-in space-y-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-md">Album Concept</span>
              <h2 className="text-3xl font-black text-white mt-2">{album.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{album.occasion} • {album.songs.length} Tracks</p>
              {album.comments && <p className="text-gray-300 text-xs italic mt-2 max-w-xl">"{album.comments}"</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAutomateTitles || onGenerateViralAlbumTitles}
                disabled={isLoading}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                  isLoading
                    ? "bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed"
                    : "bg-teal-950 hover:bg-teal-900 text-teal-300 border-teal-500/50 shadow-md active:scale-95 cursor-pointer"
                }`}
              >
                <span>⚡ Automate Titles + Track Fields</span>
              </button>
              {onGenerateViralAlbumTitles && onAutomateTitles && (
                <button
                  onClick={onGenerateViralAlbumTitles}
                  disabled={isLoading}
                  className={`px-3 py-3 rounded-xl font-bold text-xs border transition-all ${
                    isLoading
                      ? "bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-600 cursor-pointer"
                  }`}
                >
                  Titles Only
                </button>
              )}
            </div>
        </div>

        {/* Review-ready banner after title automation */}
        {album.titlesReadyForReview && (
          <div className="bg-amber-950/50 border border-amber-500/50 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>✅ Titles & track fields ready for review</span>
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  AI filled song titles plus genre, mood, structure, rhyme scheme, key, and lyric seeds from the album theme.
                  Review each card below, edit anything you like, then mark reviewed or approve all.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onMarkTitlesReviewed && (
                  <button
                    onClick={onMarkTitlesReviewed}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Mark Reviewed
                  </button>
                )}
                {onApproveAllTitles && (
                  <button
                    onClick={onApproveAllTitles}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Approve All Titles
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
            {album.songs.map((song) => (
                <div key={song.id} className="space-y-2">
                  {song.titleRationale && (
                    <div className="text-[11px] text-gray-400 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2">
                      <span className="font-bold text-teal-300/80">Why this title: </span>
                      {song.titleRationale}
                    </div>
                  )}
                  <SongConfigurationCard
                    song={song}
                    albumGenres={album.genres}
                    isLoading={isLoading}
                    stylePresets={stylePresets}
                    onUpdate={onUpdateSong}
                    onRegenerateTitle={onRegenerateTitle}
                    onGenerateLyrics={onGenerateLyrics}
                    onApprove={onApproveSong}
                    onSuggestIdeas={onSuggestIdeas}
                    onEnhanceIdeas={onEnhanceIdeas}
                  />
                </div>
            ))}
        </div>

        <div className="mt-8 text-center pb-8">
             <button onClick={onFinalize} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-10 rounded-xl transition-all shadow-xl active:scale-95 cursor-pointer">
                Finalize Album Tracklist
            </button>
        </div>
    </div>
);

interface FinalizedAlbumViewProps {
    album: Album;
    onReEdit: () => void;
}
const FinalizedAlbumView = ({ album, onReEdit }: FinalizedAlbumViewProps) => {
    const approvedSongs = album.songs.filter(song => song.isApproved);

    const fullAlbumLyricsText = approvedSongs.map((song, i) => {
      const lyricsStr = song.lyrics?.[0]?.join('\n') || "No lyrics generated.";
      return `Track ${i + 1}: ${song.title}\nGenre: ${song.genre} | Mood: ${song.mood} | Scheme: ${song.rhymeScheme || 'ABAB'}\n\n${lyricsStr}`;
    }).join('\n\n====================\n\n');

    return (
        <div className="max-w-4xl mx-auto bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700 animate-fade-in shadow-2xl">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-700 pb-5 mb-6 gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Finalized Album</span>
                    <h2 className="text-3xl font-black text-white mt-1">{album.name}</h2>
                    <p className="text-gray-400 text-sm">Approved Album Tracklist & Lyrics</p>
                </div>
                <div className="flex items-center gap-3">
                    {approvedSongs.length > 0 && <CopyButton textToCopy={fullAlbumLyricsText} label="Copy Full Album" />}
                    <button onClick={onReEdit} className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all text-sm border border-gray-600">
                        Back to Editing
                    </button>
                </div>
            </header>

            {approvedSongs.length > 0 ? (
                <div className="space-y-8">
                    {approvedSongs.map((song, index) => {
                        const songLyricsText = song.lyrics?.[0]?.join('\n') || '';
                        return (
                            <div key={song.id} className="bg-gray-900/80 p-6 rounded-xl border border-gray-700/80">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                                  <div>
                                    <h3 className="text-xl font-bold text-teal-400">
                                        Track {index + 1}: {song.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Genre: {song.genre} â€¢ Mood: {song.mood} â€¢ Scheme: {song.rhymeScheme || 'ABAB'}</p>
                                  </div>
                                  <CopyButton textToCopy={`ðŸŽµ ${song.title}\n\n${songLyricsText}`} label="Copy Track" />
                                </div>
                                <div>
                                    {song.lyrics && song.lyrics.length > 0 ? (
                                        <div className="text-sm text-gray-200 font-sans leading-relaxed">
                                            {parseLyricsMarkdown(songLyricsText)}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic text-sm">No lyrics generated for this track.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-400">
                    <p>No songs have been approved yet. Return to editing to approve songs for the final album view.</p>
                </div>
            )}
        </div>
    );
};

// --- RENDER APP ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
