import React, { useState, useEffect } from "react";
import { getActiveModelId } from "../agents/llmRegistry";
import { exportAlbumToFile, exportSongsToFile } from "./exportUtils";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import LyricEnhancerModal from "./LyricEnhancerModal";
import LyricSheetExportModal from "./LyricSheetExportModal";
import D3RadarChart from "./D3RadarChart";
import { BIRTHDAY_ALBUMS } from "../data/birthdayAlbums";

// --- PRODUCTION LIBRARY VIEW COMPONENT ---
const LS_PRODUCED_LIBRARY = "produced_music_library_v1";
const LS_BIRTHDAY_SEED = "produced_library_birthday_seed_v1";

const normStr = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Normalize arbitrary lyrics payload into Song.lyrics shape (string[][]). */
const normalizeLyrics = (lyrics: unknown): string[][] => {
  if (!lyrics) return [];
  if (typeof lyrics === "string") {
    return [lyrics.split("\n")];
  }
  if (Array.isArray(lyrics)) {
    if (lyrics.length === 0) return [];
    if (lyrics.every((l) => typeof l === "string")) {
      return [lyrics.map(normStr)];
    }
    return lyrics
      .filter((v): v is unknown[] => Array.isArray(v))
      .map((version) => version.map(normStr));
  }
  return [];
};

const normalizeSong = (s: any): Song => ({
  id: normStr(s?.id) || `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: normStr(s?.title) || "Untitled Track",
  genre: normStr(s?.genre) || "Pop",
  mood: normStr(s?.mood) || "Euphoric",
  structure: normStr(s?.structure) || "Verse - Chorus - Verse - Chorus - Bridge - Chorus",
  rhymeScheme: normStr(s?.rhymeScheme) || "ABAB (Alternate Rhyme)",
  customIdeas: normStr(s?.customIdeas),
  lyrics: normalizeLyrics(s?.lyrics),
  isApproved: Boolean(s?.isApproved),
  language: s?.language ? normStr(s.language) : undefined,
  musicKey: s?.musicKey ? normStr(s.musicKey) : undefined,
  stylePresetId: s?.stylePresetId ? normStr(s.stylePresetId) : undefined,
  youtubeStyleLink: s?.youtubeStyleLink ? normStr(s.youtubeStyleLink) : undefined,
  referenceSongTitle: s?.referenceSongTitle ? normStr(s.referenceSongTitle) : undefined,
  artistStyleName: s?.artistStyleName ? normStr(s.artistStyleName) : undefined,
  tags: Array.isArray(s?.tags) ? s.tags.map(normStr) : [],
  titleRationale: s?.titleRationale ? normStr(s.titleRationale) : undefined,
  activeLyricVersion: typeof s?.activeLyricVersion === "number" ? s.activeLyricVersion : 0,
});

const normalizeAlbum = (a: any): Album => {
  const songs = (Array.isArray(a?.songs) ? a.songs : []).map(normalizeSong);
  return {
    id: normStr(a?.id) || `album-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: normStr(a?.name) || "Untitled Album",
    occasion: normStr(a?.occasion) || "General Album",
    comments: normStr(a?.comments),
    genres: Array.isArray(a?.genres) ? a.genres.map(normStr) : [],
    songCount: typeof a?.songCount === "number" ? a.songCount : songs.length,
    songs,
    language: a?.language ? normStr(a.language) : undefined,
    titlesReadyForReview: Boolean(a?.titlesReadyForReview),
  };
};

/** Merge birthday seed albums into library state (skip ids already present). */
const mergeBirthdaySeed = (lib: { albums: Album[]; songs: Song[] }) => {
  const existingAlbumIds = new Set(lib.albums.map((a) => a.id));
  const missing = BIRTHDAY_ALBUMS.filter((a) => !existingAlbumIds.has(a.id)).map(normalizeAlbum);
  if (missing.length === 0) return lib;

  const existingSongIds = new Set(lib.songs.map((s) => s.id));
  const seedSongs: Song[] = [];
  for (const alb of missing) {
    for (const s of alb.songs) {
      if (!existingSongIds.has(s.id)) {
        seedSongs.push(s);
        existingSongIds.add(s.id);
      }
    }
  }
  return {
    albums: [...missing, ...lib.albums],
    songs: [...seedSongs, ...lib.songs],
  };
};

interface ProductionLibraryViewProps {
  currentAlbum: Album | null;
  onLoadAlbumIntoWorkspace: (album: Album) => void;
  onAddSongToActiveAlbum: (song: Song) => void;
}

const ProductionLibraryView: React.FC<ProductionLibraryViewProps> = ({
  currentAlbum,
  onLoadAlbumIntoWorkspace,
  onAddSongToActiveAlbum
}) => {
  const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [isTaggingAI, setIsTaggingAI] = useState(false);
  const [selectedSongForEnhancer, setSelectedSongForEnhancer] = useState<Song | null>(null);
  const [enhancerInitialLine, setEnhancerInitialLine] = useState("");
  const [selectedSongForSheet, setSelectedSongForSheet] = useState<Song | null>(null);
  const [selectedAlbumForSheet, setSelectedAlbumForSheet] = useState<Album | null>(null);

  const [libraryData, setLibraryData] = useState<{ albums: Album[]; songs: Song[] }>(() => {
    let base: { albums: Album[]; songs: Song[] } = { albums: [], songs: [] };
    try {
      const saved = localStorage.getItem(LS_PRODUCED_LIBRARY);
      if (saved) {
        const parsed = JSON.parse(saved);
        base = {
          albums: Array.isArray(parsed?.albums) ? parsed.albums.map(normalizeAlbum) : [],
          songs: Array.isArray(parsed?.songs) ? parsed.songs.map(normalizeSong) : [],
        };
      }
    } catch (e) {
      console.error("Error loading library from storage", e);
    }
    // First visit only: seed the 4 family birthday albums (10 songs each).
    // Later visits do not resurrect albums the user intentionally deleted.
    // The "Load Birthday Collection" button restores them on demand.
    let shouldSeed = false;
    try {
      shouldSeed = localStorage.getItem(LS_BIRTHDAY_SEED) !== "1";
    } catch {
      shouldSeed = base.albums.length === 0;
    }
    if (!shouldSeed && base.albums.length === 0) {
      // Empty library after user wipe — still offer the collection via button only
      shouldSeed = false;
    }
    if (!shouldSeed) {
      return base;
    }
    const seeded = mergeBirthdaySeed(base);
    try {
      localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(seeded));
      localStorage.setItem(LS_BIRTHDAY_SEED, "1");
    } catch (e) {
      console.error("Error saving seeded library", e);
    }
    return seeded;
  });

  // Sync current album into persistent library if present
  useEffect(() => {
    if (currentAlbum && currentAlbum.name) {
      setLibraryData(prev => {
        const existingAlbumIndex = prev.albums.findIndex(a => a.id === currentAlbum.id);
        let updatedAlbums = [...prev.albums];
        if (existingAlbumIndex >= 0) {
          updatedAlbums[existingAlbumIndex] = currentAlbum;
        } else {
          updatedAlbums.unshift(currentAlbum);
        }

        // Also aggregate songs
        let updatedSongs = [...prev.songs];
        currentAlbum.songs?.forEach(s => {
          if (!updatedSongs.some(existing => existing.id === s.id)) {
            updatedSongs.unshift(s);
          }
        });

        const newLibrary = { albums: updatedAlbums, songs: updatedSongs };
        try {
          localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(newLibrary));
        } catch (e) {
          console.error("Error saving library data", e);
        }
        return newLibrary;
      });
    }
  }, [currentAlbum]);

  const handleDeleteAlbum = (albumId: string) => {
    if (confirm("Are you sure you want to delete this album from your production library?")) {
      const updated = {
        ...libraryData,
        albums: libraryData.albums.filter(a => a.id !== albumId)
      };
      setLibraryData(updated);
      localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(updated));
    }
  };

  const handleDeleteSong = (songId: string) => {
    if (confirm("Delete song from library?")) {
      const updated = {
        ...libraryData,
        songs: libraryData.songs.filter(s => s.id !== songId)
      };
      setLibraryData(updated);
      localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(updated));
    }
  };

  const handleExportFullLibraryJSON = () => {
    const content = JSON.stringify(libraryData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_library_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportLibraryJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        // Accept: { albums, songs } | single Album | { albums: [album] } | Album[]
        let rawAlbums: any[] = [];
        let rawSongs: any[] = [];
        if (Array.isArray(parsed)) {
          rawAlbums = parsed.filter((p) => p && (p.songs || p.occasion || p.name) && !p.lyrics);
          rawSongs = parsed.filter((p) => p && p.lyrics !== undefined && !p.songs);
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.albums)) rawAlbums = parsed.albums;
          else if (parsed.songs || parsed.occasion || (parsed.name && parsed.id && !parsed.lyrics)) {
            rawAlbums = [parsed];
          }
          if (Array.isArray(parsed.songs) && !rawAlbums.some((a) => a === parsed)) {
            // Library format: top-level singles list (may also exist inside albums)
            const albumSongIds = new Set(
              rawAlbums.flatMap((a: any) => (Array.isArray(a?.songs) ? a.songs.map((s: any) => s?.id) : []))
            );
            rawSongs = parsed.songs.filter((s: any) => !albumSongIds.has(s?.id));
          }
        }

        if (rawAlbums.length === 0 && rawSongs.length === 0) {
          alert("No albums or songs found in this JSON file.");
          return;
        }

        const importedAlbums = rawAlbums.map(normalizeAlbum);
        const importedSongs = rawSongs.map(normalizeSong);

        const albumIdSet = new Set(libraryData.albums.map((a) => a.id));
        const songIdSet = new Set(libraryData.songs.map((s) => s.id));
        const newAlbums = importedAlbums.filter((a) => {
          if (albumIdSet.has(a.id)) return false;
          albumIdSet.add(a.id);
          return true;
        });
        const newSongs = importedSongs.filter((s) => {
          if (songIdSet.has(s.id)) return false;
          songIdSet.add(s.id);
          return true;
        });

        const newLib = {
          albums: [...newAlbums, ...libraryData.albums],
          songs: [...newSongs, ...libraryData.songs],
        };
        setLibraryData(newLib);
        localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(newLib));
        alert(
          `Imported ${newAlbums.length} album(s) and ${newSongs.length} song(s).` +
            (importedAlbums.length !== newAlbums.length || importedSongs.length !== newSongs.length
              ? " Duplicate IDs were skipped."
              : "")
        );
      } catch (err) {
        alert("Invalid JSON file format.");
      } finally {
        // Allow re-importing the same file
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleLoadBirthdayCollection = () => {
    setLibraryData(prev => {
      const merged = mergeBirthdaySeed(prev);
      try {
        localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(merged));
        localStorage.setItem(LS_BIRTHDAY_SEED, "1");
      } catch (err) {
        console.error("Error saving birthday collection", err);
      }
      return merged;
    });
    alert("Family Birthday Collection loaded: Grandpa, Grandma, Mum, and Dad albums (10 songs each).");
  };

  // AI-Driven Tagger for analyzing lyrics & assigning keywords
  const handleAutoTagLibraryWithAI = async () => {
    if (libraryData.songs.length === 0) {
      alert("No songs available in library to auto-tag.");
      return;
    }
    setIsTaggingAI(true);
    try {
      const untaggedOrAll = libraryData.songs.slice(0, 10);
      const songSnippets = untaggedOrAll.map((s, idx) => ({
        index: idx,
        id: s.id,
        title: s.title,
        genre: s.genre,
        mood: s.mood,
        sampleLyrics: s.lyrics?.[0]?.slice(0, 8).join(" ") || ""
      }));

      const prompt = `Analyze these music track snippets and assign 3-5 concise, evocative keywords/tags (e.g., 'Love', 'Melancholy', 'Upbeat', 'Nostalgic', 'Club Banger', 'Heartbreak') to each track based on lyrics and mood.\n\nTracks:\n${JSON.stringify(songSnippets, null, 2)}`;

      const response = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['id', 'tags']
            }
          }
        }
      });

      const taggedResults = JSON.parse(response.text || '[]') as { id: string; tags: string[] }[];
      const tagMap = new Map(taggedResults.map(t => [t.id, t.tags]));

      const updatedSongs = libraryData.songs.map(s => ({
        ...s,
        tags: tagMap.get(s.id) || s.tags || ['Acoustic', 'Melodic', s.mood]
      }));

      const updatedAlbums = libraryData.albums.map(a => ({
        ...a,
        songs: a.songs?.map(s => ({
          ...s,
          tags: tagMap.get(s.id) || s.tags || ['Acoustic', 'Melodic', s.mood]
        })) || []
      }));

      const newLib = { albums: updatedAlbums, songs: updatedSongs };
      setLibraryData(newLib);
      localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(newLib));
      alert("AI Auto-Tagger successfully analyzed your tracks and assigned tags!");
    } catch (err) {
      console.error("Auto-tagging error", err);
      alert("Auto-tagging failed. Please try again.");
    } finally {
      setIsTaggingAI(false);
    }
  };

  // Aggregated Mood Distribution for Radar Chart
  const moodCountsMap = new Map<string, number>();
  const allLibrarySongs = [
    ...libraryData.songs,
    ...libraryData.albums.flatMap(a => a.songs || [])
  ];

  // Default baseline moods if none
  const defaultMoods = ['Euphoric', 'Melancholic', 'Aggressive', 'Romantic', 'Chill', 'Introspective'];
  defaultMoods.forEach(m => moodCountsMap.set(m, 0));

  allLibrarySongs.forEach(s => {
    const m = s.mood || 'Euphoric';
    moodCountsMap.set(m, (moodCountsMap.get(m) || 0) + 1);
  });

  const totalSongsCount = allLibrarySongs.length || 1;
  const radarData = Array.from(moodCountsMap.entries()).map(([mood, count]) => ({
    mood,
    count,
    percentage: Math.round((count / totalSongsCount) * 100)
  }));

  const filteredAlbums = libraryData.albums.filter(a => {
    // Optional chaining + fallbacks: imported JSON may miss fields
    const matchesSearch =
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.occasion || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.genres?.some(g => (g || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.songs?.some(s => s.tags?.some(t => (t || "").toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesMood = selectedMoodFilter
      ? a.songs?.some(s => (s.mood || "").toLowerCase() === selectedMoodFilter.toLowerCase())
      : true;

    return matchesSearch && matchesMood;
  });

  const filteredSongs = libraryData.songs.filter(s => {
    const matchesSearch =
      (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.genre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.mood || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags?.some(t => (t || "").toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMoodFilter
      ? (s.mood || "").toLowerCase() === selectedMoodFilter.toLowerCase()
      : true;

    return matchesSearch && matchesMood;
  });

  return (
    <div className="space-y-6 animate-fade-in my-6">
      {/* Top Banner */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 border border-teal-500/30 px-2.5 py-0.5 rounded">
            Persistent Archives & Analytics
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1.5 flex items-center gap-2">
            📚 Produced Songs & Albums Library
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            {libraryData.albums.length} Albums • {libraryData.songs.length} Single Produced Songs
            {" "}• Birthday Collection: 4 albums / 40 songs included
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadBirthdayCollection}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            title="Load/restore the 4 family birthday albums (Grandpa, Grandma, Mum, Dad)"
          >
            <span>🎂 Load Birthday Collection</span>
          </button>
          <button
            onClick={handleAutoTagLibraryWithAI}
            disabled={isTaggingAI}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            title="Auto-analyze lyrics and assign keywords/tags using AI"
          >
            {isTaggingAI ? <span>✨ Tagging Tracks with AI...</span> : <span>🏷️ AI Auto-Tagger</span>}
          </button>
          <button
            onClick={handleExportFullLibraryJSON}
            className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>📥 Export Library Backup (JSON)</span>
          </button>
          <label className="px-3.5 py-2 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 hover:text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer">
            <span>📤 Import / Restore JSON</span>
            <input type="file" accept=".json" onChange={handleImportLibraryJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Radar Analytics Chart + Global Filter Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: D3 Radar Chart */}
        <div className="lg:col-span-5">
          <React.Suspense fallback={<div className="p-4 text-xs text-gray-500">Loading radar</div>}>
            <D3RadarChart
              data={radarData}
              selectedMood={selectedMoodFilter}
              onSelectMood={setSelectedMoodFilter}
            />
          </React.Suspense>
        </div>

        {/* Right: Search + Active Filters Summary */}
        <div className="lg:col-span-7 bg-gray-800/90 p-5 rounded-2xl border border-gray-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              🔎 Global Search & Tag Filter
            </h4>
            {selectedMoodFilter && (
              <span className="text-xs bg-teal-950 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                Active Filter: {selectedMoodFilter}
                <button onClick={() => setSelectedMoodFilter(null)} className="ml-1 text-teal-400 hover:text-white">✕</button>
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library by title, genre, mood, or tags (e.g., 'Melancholy', 'Love')..."
              className="bg-gray-900 text-xs text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 w-full pl-9"
            />
            <span className="absolute left-3 top-3 text-xs text-gray-500"></span>
          </div>

          <div className="flex items-center gap-2 bg-gray-900/80 p-1 rounded-xl border border-gray-700/80 max-w-fit">
            <button
              onClick={() => setActiveTab('albums')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'albums' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              💿 Albums ({filteredAlbums.length})
            </button>
            <button
              onClick={() => setActiveTab('songs')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'songs' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              🎵 Single Songs ({filteredSongs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Albums Collection */}
      {activeTab === 'albums' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.length > 0 ? (
            filteredAlbums.map((album) => (
              <div key={album.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-4 hover:border-teal-500/50 transition-all flex flex-col justify-between shadow-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                      {album.occasion || 'General Album'}
                    </span>
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="text-gray-500 hover:text-red-400 text-xs p-1"
                      title="Delete album"
                    >
                      🗑
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-white">{album.name}</h3>
                  <p className="text-xs text-gray-400">{album.songs?.length || 0} Tracks • Genres: {album.genres?.join(', ') || 'Pop'}</p>

                  <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-700/80 max-h-32 overflow-y-auto space-y-1">
                    {album.songs?.map((s, i) => (
                      <div key={s.id || i} className="text-xs text-gray-300 flex justify-between">
                        <span>Track {i + 1}: <strong>{s.title}</strong></span>
                        <span className="text-[10px] text-gray-500">{s.genre}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-700/80">
                  <button
                    onClick={() => onLoadAlbumIntoWorkspace(album)}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    📂 Load Album into Workspace
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedAlbumForSheet(album)}
                      className="py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-500/40 text-indigo-200 text-xs font-bold rounded-lg transition-all"
                      title="View Lead Sheet export for album"
                    >
                      🎼 Sheet
                    </button>
                    <button
                      onClick={() => exportAlbumToFile(album, 'txt')}
                      className="py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded-lg transition-all"
                    >
                      📥 TXT
                    </button>
                    <button
                      onClick={() => exportAlbumToFile(album, 'json')}
                      className="py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded-lg transition-all"
                    >
                      📄 JSON
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              No albums match your search query or no albums created yet.
            </div>
          )}
        </div>
      )}

      {/* Single Songs Collection */}
      {activeTab === 'songs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <div key={song.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-3 flex flex-col justify-between shadow-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                      {song.genre} • {song.mood}
                    </span>
                    <button
                      onClick={() => handleDeleteSong(song.id)}
                      className="text-gray-500 hover:text-red-400 text-xs"
                      title="Delete song"
                    >
                      🗑
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white">{song.title}</h3>

                  {/* AI Assigned Tags */}
                  {song.tags && song.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 py-1">
                      {song.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                           {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="bg-gray-900/90 p-3 rounded-xl border border-gray-700 max-h-40 overflow-y-auto text-xs">
                    {song.lyrics?.[0] ? parseLyricsMarkdown(song.lyrics[0].join('\n')) : "No lyrics stored."}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const firstLine = song.lyrics?.[0]?.find(l => l && !l.startsWith('[') && !l.startsWith('#')) || song.lyrics?.[0]?.[0] || "";
                        setEnhancerInitialLine(firstLine);
                        setSelectedSongForEnhancer(song);
                      }}
                      className="py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                    >
                      <span>✨ Enhance</span>
                    </button>
                    <button
                      onClick={() => setSelectedSongForSheet(song)}
                      className="py-2 bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-500/40 text-indigo-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                    >
                      <span>🎼 Lead Sheet</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <CopyButton
                      textToCopy={`🎵 ${song.title}\n\n${song.lyrics?.[0]?.join('\n') || ''}`}
                      label="Copy Lyrics"
                    />
                    <button
                      onClick={() => exportSongsToFile([song], song.title.replace(/\s+/g, '_'), 'txt')}
                      className="py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs"
                    >
                      📥 Export TXT
                    </button>
                  </div>

                  {onAddSongToActiveAlbum && (
                    <button
                      onClick={() => onAddSongToActiveAlbum(song)}
                      className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      ➕ Add to Active Album Tracklist
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              No songs found in library matching query.
            </div>
          )}
        </div>
      )}

      {/* Enhancer Modal from Library */}
      {selectedSongForEnhancer && (
        <LyricEnhancerModal
          isOpen={!!selectedSongForEnhancer}
          onClose={() => setSelectedSongForEnhancer(null)}
          initialLine={enhancerInitialLine}
          songContext={{
            title: selectedSongForEnhancer.title,
            genre: selectedSongForEnhancer.genre,
            mood: selectedSongForEnhancer.mood,
            rhymeScheme: selectedSongForEnhancer.rhymeScheme,
            language: selectedSongForEnhancer.language
          }}
          onApplyReplacement={(newLine) => {
            if (selectedSongForEnhancer.lyrics?.[0]) {
              const updatedLines = [...selectedSongForEnhancer.lyrics[0]];
              const idx = updatedLines.findIndex(l => l.includes(enhancerInitialLine) || l === enhancerInitialLine);
              if (idx !== -1) {
                updatedLines[idx] = newLine;
              } else {
                updatedLines.push(newLine);
              }
              const updatedSong = { ...selectedSongForEnhancer, lyrics: [updatedLines] };
              const updatedSongs = libraryData.songs.map(s => s.id === updatedSong.id ? updatedSong : s);
              const newLib = { ...libraryData, songs: updatedSongs };
              setLibraryData(newLib);
              localStorage.setItem(LS_PRODUCED_LIBRARY, JSON.stringify(newLib));
              setSelectedSongForEnhancer(updatedSong);
            }
          }}
        />
      )}

      {/* Lead Sheet Modal for Single Song */}
      {selectedSongForSheet && (
        <React.Suspense fallback={null}>
          <LyricSheetExportModal
            isOpen={!!selectedSongForSheet}
            onClose={() => setSelectedSongForSheet(null)}
            song={selectedSongForSheet}
          />
        </React.Suspense>
      )}

      {/* Lead Sheet Modal for Album */}
      {selectedAlbumForSheet && (
        <React.Suspense fallback={null}>
          <LyricSheetExportModal
            isOpen={!!selectedAlbumForSheet}
            onClose={() => setSelectedAlbumForSheet(null)}
            album={selectedAlbumForSheet}
          />
        </React.Suspense>
      )}
    </div>
  );
};
export default ProductionLibraryView;
