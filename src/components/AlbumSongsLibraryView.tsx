import React, { useState } from "react";
import { exportAlbumToFile, exportSongsToFile } from "./exportUtils";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import LyricEnhancerModal from "./LyricEnhancerModal";
import LyricSheetExportModal from "./LyricSheetExportModal";
import SongVersionStudio from "./SongVersionStudio";
import { generateProceduralLyricVersions } from "../agents/proceduralLyrics";
import { generateThreeLyricVersions } from "../agents/generateThreeLyricVersions";
import { getActiveModelId } from "../agents/llmRegistry";
import { registerAbortJob, completeAbortJob, runWithConcurrency } from "../agents/abortSupervisor";

// --- ALBUM SONGS LIBRARY VIEW COMPONENT ---
interface AlbumSongsLibraryViewProps {
  album: Album | null;
  onUpdateAlbum: (data: Partial<Album>) => void;
  onUpdateSong: (songId: string, updatedData: Partial<Song>) => void;
  onAddSongsToAlbum: (newSongs: Song[]) => void;
}

const AlbumSongsLibraryView: React.FC<AlbumSongsLibraryViewProps> = ({
  album,
  onUpdateAlbum,
  onUpdateSong,
  onAddSongsToAlbum
}) => {
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [reInstruction, setReInstruction] = useState("");
  const [isApplyingInstruction, setIsApplyingInstruction] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [enhancerInitialLine, setEnhancerInitialLine] = useState("");
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const bulkAbortRef = React.useRef<AbortController | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  if (!album || !album.songs || album.songs.length === 0) {
    return (
      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center space-y-4 animate-fade-in shadow-xl max-w-2xl mx-auto my-8">
        <div className="text-4xl">💿</div>
        <h3 className="text-xl font-bold text-white">No Album Songs Found</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          You haven't added any songs to your album yet. Use Virality Agent Studio to draft 3 track options or create a new tracklist below.
        </p>
        <button
          onClick={() => {
            const blankSong: Song = {
              id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              title: "Track 1 - Unnamed Hit",
              genre: "Pop",
              mood: "Euphoric",
              structure: "Verse - Chorus - Verse - Chorus - Bridge - Chorus",
              rhymeScheme: "ABAB (Alternate Rhyme)",
              customIdeas: "Brand new song concept",
              lyrics: [],
              isApproved: false
            };
            onAddSongsToAlbum([blankSong]);
          }}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md text-xs cursor-pointer active:scale-95"
        >
          ➕ Start Album Tracklist with a Song
        </button>
      </div>
    );
  }

  const filteredSongs = album.songs.filter(s => 
    s.title.toLowerCase().includes(filterQuery.toLowerCase()) || 
    s.genre.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const activeSong = album.songs.find(s => s.id === selectedSongId) || album.songs[0];

  // Bulk actions for album tracklist
  const handleSelectAll = () => {
    if (selectedTrackIds.length === filteredSongs.length) {
      setSelectedTrackIds([]);
    } else {
      setSelectedTrackIds(filteredSongs.map(s => s.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedTrackIds.length === 0) return;
    // Single batch update — calling onUpdateSong per track overwrote all but
    // the last change because each call derived from the same stale album snapshot.
    const updatedSongs = album.songs.map(s =>
      selectedTrackIds.includes(s.id) ? { ...s, isApproved: true } : s
    );
    onUpdateAlbum({ songs: updatedSongs, songCount: updatedSongs.length });
    alert(`Bulk approved ${selectedTrackIds.length} tracks!`);
  };

  const handleBulkExportSelected = (format: 'txt' | 'json') => {
    const selectedSongs = album.songs.filter(s => selectedTrackIds.includes(s.id));
    if (selectedSongs.length === 0) return;
    exportSongsToFile(selectedSongs, `${album.name.replace(/\s+/g, '_')}_selected_tracks`, format);
  };

  const handleBulkRemoveSelected = () => {
    if (selectedTrackIds.length === 0) return;
    if (confirm(`Remove ${selectedTrackIds.length} selected tracks from album?`)) {
      const remaining = album.songs.filter(s => !selectedTrackIds.includes(s.id));
      onUpdateAlbum({ songs: remaining, songCount: remaining.length });
      setSelectedTrackIds([]);
    }
  };

  const handleApplyAIChanges = async () => {
    if (!activeSong || !reInstruction.trim()) return;
    setIsApplyingInstruction(true);
    try {
      const versionIdx = Math.min(activeSong.activeLyricVersion ?? 0, Math.max((activeSong.lyrics?.length || 1) - 1, 0));
      const currentText = activeSong.lyrics?.[versionIdx]?.join('\n') || "No lyrics yet.";
      const prompt = `You are a legendary songwriting producer modifying song lyrics based on user instructions.

Song Title: "${activeSong.title}"
Genre: ${activeSong.genre}
Mood: ${activeSong.mood}
Current Lyrics:
${currentText}

User Instructions / Specific Changes:
"${reInstruction}"

Task: Rewrite and refine the song lyrics according to the user instructions. Maintain section headers like [Verse 1], [Chorus], [Bridge], [Outro].
Format as markdown.
Return ONLY the rewritten lyrics text (no JSON required).
`;
      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt
      });
      let newLyricsText = res.text || "";
      if (newLyricsText.includes("\n\n") && newLyricsText.startsWith("[PROCEDURAL")) {
        newLyricsText = newLyricsText.substring(newLyricsText.indexOf("\n\n") + 2).trim();
      }
      if (!newLyricsText.trim()) {
        throw new Error("Empty AI response");
      }
      const lines = newLyricsText.split('\n');
      // Update ONLY the selected version — do not wipe other lyric versions
      const existing = (activeSong.lyrics || []).map(v => (Array.isArray(v) ? [...v] : []));
      if (existing.length === 0) {
        onUpdateSong(activeSong.id, { lyrics: [lines], activeLyricVersion: 0 });
      } else {
        const next = existing.map((v, i) => (i === versionIdx ? lines : v));
        onUpdateSong(activeSong.id, { lyrics: next, activeLyricVersion: versionIdx });
      }
      setReInstruction("");
      alert(`AI updated lyrics for "${activeSong.title}" (V${versionIdx + 1}) successfully! Other versions were preserved.`);
    } catch (err) {
      console.error("Error applying AI changes to song:", err);
      alert("Failed to apply AI changes. Please try again.");
    } finally {
      setIsApplyingInstruction(false);
    }
  };

  const handleGenerateVersionsForActive = async (songId: string) => {
    const target = album.songs.find(s => s.id === songId);
    if (!target) return;
    setIsApplyingInstruction(true);
    try {
      const result = await generateThreeLyricVersions({
        title: target.title,
        genre: target.genre,
        mood: target.mood,
        customIdeas: target.customIdeas,
        albumName: album.name,
        occasion: album.occasion,
        albumComments: album.comments,
        structure: target.structure,
        rhymeScheme: target.rhymeScheme,
        language: target.language || album.language,
      });
      const versions = result.versions.slice(0, 3);
      onUpdateSong(songId, { lyrics: versions, activeLyricVersion: 0 });
      setSelectedSongId(songId);
    } catch (err) {
      console.error("Generate versions error:", err);
      const proc = generateProceduralLyricVersions({
        title: target.title,
        genre: target.genre,
        mood: target.mood,
        customIdeas: target.customIdeas,
        albumName: album.name,
        occasion: album.occasion,
        structure: target.structure,
      }, 3);
      onUpdateSong(songId, { lyrics: proc, activeLyricVersion: 0 });
    } finally {
      setIsApplyingInstruction(false);
    }
  };

  const handleGenerateVersionsForAllTracks = async () => {
    if (!album?.songs?.length) return;
    setIsApplyingInstruction(true);
    const abort = new AbortController();
    bulkAbortRef.current = abort;
    const job = registerAbortJob("bulk-lyrics", `Album Songs bulk 3-version — ${album.name}`, abort);
    const tracks = [...album.songs];
    setBulkProgress({ done: 0, total: tracks.length });
    let completed = 0;
    try {
      const { results, aborted } = await runWithConcurrency(
        tracks,
        async (song) => {
          const result = await generateThreeLyricVersions({
            title: song.title,
            genre: song.genre,
            mood: song.mood,
            customIdeas: song.customIdeas,
            albumName: album.name,
            occasion: album.occasion,
            albumComments: album.comments,
            structure: song.structure,
            rhymeScheme: song.rhymeScheme,
            language: song.language || album.language,
            modelId: getActiveModelId(),
            signal: abort.signal,
          });
          completed += 1;
          setBulkProgress({ done: completed, total: tracks.length });
          return {
            ...song,
            lyrics: result.versions.slice(0, 3),
            activeLyricVersion: 0,
          } as Song;
        },
        3,
        abort.signal
      );

      const generated = results.filter((s): s is Song => Boolean(s && s.id));
      // Merge generated lyrics into full tracklist (keep non-generated tracks as-is)
      const byId = new Map(generated.map(s => [s.id, s]));
      const updatedSongs = tracks.map(s => byId.get(s.id) || s);
      onUpdateAlbum({ songs: updatedSongs, songCount: updatedSongs.length });
      if (aborted || abort.signal.aborted) {
        alert(`Bulk generation stopped. ${generated.length}/${tracks.length} tracks updated. Use Stop Bulk / Kill All to halt future runs.`);
      } else {
        alert(`Generated 3 lyric versions for ${generated.length} tracks (parallel ×3). Open Song Version Studio to review V1/V2/V3.`);
      }
    } catch (err) {
      console.error("Bulk generate versions error:", err);
      alert("Bulk version generation failed. Try per-track Generate 3 Versions.");
    } finally {
      completeAbortJob(job.id);
      bulkAbortRef.current = null;
      setBulkProgress(null);
      setIsApplyingInstruction(false);
    }
  };

  const handleStopBulk = () => {
    bulkAbortRef.current?.abort();
  };

  const handleAddBlankSong = () => {
    const newCount = album.songs.length + 1;
    const newSong: Song = {
      id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `Track ${newCount} - New Song`,
      genre: album.genres[0] || GENRES[0],
      mood: "Euphoric & High Energy",
      structure: "Verse - Chorus - Verse - Chorus - Bridge - Chorus",
      rhymeScheme: "ABAB (Alternate Rhyme)",
      customIdeas: "",
      lyrics: [],
      isApproved: false
    };
    onAddSongsToAlbum([newSong]);
  };

  const handleRemoveSong = (songId: string) => {
    if (confirm("Are you sure you want to remove this song from the album?")) {
      const updatedSongs = album.songs.filter(s => s.id !== songId);
      onUpdateAlbum({ songs: updatedSongs, songCount: updatedSongs.length });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in my-6">
      {/* Header Banner */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-500/30 px-2.5 py-0.5 rounded">
            Album Tracklist & Lyrics Library
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1.5 flex items-center gap-2">
            💿 {album.name}
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            {album.songs.length} Tracks Total • {album.songs.filter(s => s.isApproved).length} Approved
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search album songs..."
            className="bg-gray-900 text-xs text-white p-2.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button
            onClick={() => exportAlbumToFile(album, 'txt')}
            className="px-3.5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Download full album lyrics as a text file"
          >
            <span>📥 Export TXT</span>
          </button>
          <button
            onClick={() => exportAlbumToFile(album, 'json')}
            className="px-3.5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Download full album as a JSON file"
          >
            <span>📄 Export JSON</span>
          </button>
          <button
            onClick={handleGenerateVersionsForAllTracks}
            disabled={isApplyingInstruction}
            title="Run Album Studio pipeline for every track — 3 lyric versions each, parallel ×3"
            className="bg-gradient-to-r from-indigo-700 to-teal-600 hover:from-indigo-600 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <span>🎛 Generate 3 Versions × All Tracks</span>
          </button>
          {isApplyingInstruction && (
            <button
              onClick={handleStopBulk}
              title="Stop bulk generation"
              className="bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-500/40 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>⏹ Stop Bulk{bulkProgress ? ` (${bulkProgress.done}/${bulkProgress.total})` : ''}</span>
            </button>
          )}
          <button
            onClick={() => handleGenerateVersionsForActive(activeSong?.id || album.songs[0]?.id)}
            disabled={isApplyingInstruction || !album.songs.length}
            title="Generate 3 lyric versions for the selected track"
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <span>⚡ Generate 3 Versions</span>
          </button>
          <button
            onClick={handleAddBlankSong}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>➕ Add Song to Album</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Tracklist Selector + Active Song View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Tracklist Sidebar with Bulk-Action Panel (4 cols) */}
        <div className="lg:col-span-4 bg-gray-800 p-4 rounded-2xl border border-gray-700 space-y-3 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Tracks ({filteredSongs.length})</span>
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-teal-400 hover:text-teal-300 font-bold uppercase underline"
            >
              {selectedTrackIds.length === filteredSongs.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Bulk Action Bar when items selected */}
          {selectedTrackIds.length > 0 && (
            <div className="bg-teal-950/90 border border-teal-500/40 p-2.5 rounded-xl space-y-2 animate-fade-in text-xs">
              <span className="text-[10px] font-bold text-teal-300 block">
                ⚡ Bulk Action Panel ({selectedTrackIds.length} Selected):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleBulkApprove}
                  className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px]"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={handleBulkRemoveSelected}
                  className="py-1.5 px-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg text-[10px]"
                >
                  🗑 Delete
                </button>
                <button
                  onClick={() => handleBulkExportSelected('txt')}
                  className="py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg text-[10px]"
                >
                  📥 Export TXT
                </button>
                <button
                  onClick={() => handleBulkExportSelected('json')}
                  className="py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg text-[10px]"
                >
                  📄 Export JSON
                </button>
              </div>
            </div>
          )}

          {filteredSongs.map((song, index) => {
            const isSelected = activeSong.id === song.id;
            const isCheckedForBulk = selectedTrackIds.includes(song.id);

            return (
              <div
                key={song.id}
                onClick={() => setSelectedSongId(song.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected 
                    ? "bg-teal-950/80 border-teal-500 text-white shadow-md" 
                    : isCheckedForBulk
                    ? "bg-purple-950/50 border-purple-500/60 text-white"
                    : "bg-gray-900/80 hover:bg-gray-700/80 border-gray-700/80 text-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCheckedForBulk}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTrackIds([...selectedTrackIds, song.id]);
                        } else {
                          setSelectedTrackIds(selectedTrackIds.filter(id => id !== song.id));
                        }
                      }}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-gray-900 border-gray-700"
                    />
                    <span className="text-[10px] font-mono text-teal-400 font-bold">Track {index + 1}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSong(song.id, { isApproved: !song.isApproved });
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      song.isApproved ? 'bg-teal-500/20 text-teal-300 border-teal-500/50' : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {song.isApproved ? "Approved ✓" : "Draft"}
                  </button>
                </div>

                {/* Inline Editable Song Title */}
                <input
                  type="text"
                  value={song.title}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateSong(song.id, { title: e.target.value })}
                  className="w-full bg-transparent font-bold text-sm text-white border-b border-transparent hover:border-gray-500 focus:border-teal-400 focus:outline-none py-0.5"
                  title="Click to rename song"
                />

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{song.genre || 'Pop'} • {song.mood || 'Euphoric'}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                        (song.lyrics?.length || 0) >= 3
                          ? "bg-teal-950/80 text-teal-300 border-teal-500/40"
                          : "bg-gray-800 text-gray-400 border-gray-600"
                      }`}
                      title={`${song.lyrics?.length || 0} lyric version(s) · primary V${(song.activeLyricVersion ?? 0) + 1}`}
                    >
                      V{song.lyrics?.length || 0} · Primary V{(song.activeLyricVersion ?? 0) + 1}
                    </span>
                    {(song.lyrics?.length || 0) < 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateVersionsForActive(song.id);
                        }}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-bold underline"
                        title="Generate 3 lyric versions for this track"
                      >
                        +3 versions
                      </button>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    title="Remove from album"
                    className="text-gray-500 hover:text-red-400 text-xs px-1 cursor-pointer"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Col: Lyrics & Re-Instruction Panel (8 cols) */}
        <div className="lg:col-span-8 bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-6">
          {activeSong ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-700 pb-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Active Editing Track</span>
                  {/* Editable Title Header */}
                  <input
                    type="text"
                    value={activeSong.title}
                    onChange={(e) => onUpdateSong(activeSong.id, { title: e.target.value })}
                    className="text-2xl font-black text-white bg-transparent border-b border-gray-700 hover:border-teal-400 focus:border-teal-400 focus:outline-none p-1 block w-full"
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Genre: <strong className="text-gray-200">{activeSong.genre}</strong></span> • 
                    <span>Mood: <strong className="text-gray-200">{activeSong.mood}</strong></span> • 
                    <span>Scheme: <strong className="text-gray-200">{activeSong.rhymeScheme || 'ABAB'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const firstLine = activeSong.lyrics?.[0]?.find(l => l && !l.startsWith('[') && !l.startsWith('#')) || activeSong.lyrics?.[0]?.[0] || "";
                      setEnhancerInitialLine(firstLine);
                      setIsEnhancerOpen(true);
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>✨ Enhance Lines</span>
                  </button>

                  <button
                    onClick={() => setIsExportSheetOpen(true)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-teal-300 font-bold rounded-xl text-xs transition-all border border-gray-600 shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🎼 Lead Sheet</span>
                  </button>

                  <CopyButton
                    textToCopy={`🎵 ${activeSong.title}\n\n${activeSong.lyrics?.[0]?.join('\n') || ''}`}
                    label="Copy Lyrics"
                  />
                </div>
              </div>

              {/* 3-Version Studio: function buttons + edit workspace */}
              <SongVersionStudio
                song={activeSong}
                onUpdate={onUpdateSong}
                onGenerateVersions={handleGenerateVersionsForActive}
                isLoading={isApplyingInstruction}
                layout="studio"
              />

              {/* Legacy compact preview of primary version */}
              <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700/80 max-h-[280px] overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Primary version preview (V{(activeSong.activeLyricVersion ?? 0) + 1})
                </div>
                {activeSong.lyrics && activeSong.lyrics.length > 0 ? (
                  parseLyricsMarkdown((activeSong.lyrics[activeSong.activeLyricVersion ?? 0] || activeSong.lyrics[0]).join('\n'))
                ) : (
                  <div className="text-center py-8 text-gray-500 space-y-2">
                    <p className="italic text-sm">No lyrics generated for this track yet.</p>
                    <p className="text-xs">Use <strong>Generate 3 Versions</strong> above, or type AI re-instructions below.</p>
                  </div>
                )}
              </div>

              {/* Interactive AI Re-instruction Box */}
              <div className="bg-gray-900/90 p-4 rounded-2xl border border-teal-500/30 space-y-3">
                <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center justify-between">
                  <span>✨ AI Lyric Re-Instruction & Custom Changes</span>
                  <span className="text-[10px] text-gray-400 font-normal">Instruct AI to rewrite verses, tweak cadence, or add viral hooks</span>
                </label>

                <textarea
                  value={reInstruction}
                  onChange={(e) => setReInstruction(e.target.value)}
                  placeholder='e.g., "Make Verse 2 focus on driving through midnight rain in Tokyo, make the chorus 15-second TikTok ready, add background ad-lib calls"'
                  rows={3}
                  className="w-full bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-xs leading-relaxed"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleApplyAIChanges}
                    disabled={isApplyingInstruction || !reInstruction.trim()}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 ${
                      isApplyingInstruction || !reInstruction.trim()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-teal-600 hover:bg-teal-500 cursor-pointer active:scale-95"
                    }`}
                  >
                    {isApplyingInstruction ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Applying Changes with AI...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Implement AI Changes & Rewrite Lyrics</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lyric Line Enhancer Modal */}
              {isEnhancerOpen && (
                <LyricEnhancerModal
                  isOpen={isEnhancerOpen}
                  onClose={() => setIsEnhancerOpen(false)}
                  initialLine={enhancerInitialLine}
                  songContext={{
                    title: activeSong.title,
                    genre: activeSong.genre,
                    mood: activeSong.mood,
                    rhymeScheme: activeSong.rhymeScheme,
                    language: activeSong.language || album.language
                  }}
                  onApplyReplacement={(newLine) => {
                    const versionIdx = activeSong.activeLyricVersion ?? 0;
                    const existing = (activeSong.lyrics || []).map(v => (Array.isArray(v) ? [...v] : []));
                    if (existing.length === 0) {
                      onUpdateSong(activeSong.id, { lyrics: [[newLine]], activeLyricVersion: 0 });
                      return;
                    }
                    const updatedLines = [...(existing[versionIdx] || [])];
                    const idx = updatedLines.findIndex(l => l.includes(enhancerInitialLine) || l === enhancerInitialLine);
                    if (idx !== -1) {
                      updatedLines[idx] = newLine;
                    } else {
                      updatedLines.push(newLine);
                    }
                    const next = existing.map((v, i) => (i === versionIdx ? updatedLines : v));
                    onUpdateSong(activeSong.id, { lyrics: next, activeLyricVersion: versionIdx });
                  }}
                />
              )}

              {/* Lead Sheet Modal */}
              {isExportSheetOpen && (
                <React.Suspense fallback={null}>
                  <LyricSheetExportModal
                    isOpen={isExportSheetOpen}
                    onClose={() => setIsExportSheetOpen(false)}
                    song={activeSong}
                    album={album}
                  />
                </React.Suspense>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              Select a song from the tracklist to view and edit lyrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AlbumSongsLibraryView;
