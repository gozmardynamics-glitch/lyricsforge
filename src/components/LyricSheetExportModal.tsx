import React, { useState } from "react";
import { Song, Album } from "../types";
import { parseLyricsMarkdown } from "./shared";
import { generateLyricsPdf } from "./generateLyricsPdf";
// --- MULTI-FORMAT LYRIC SHEET & PRINT-READY EXPORT MODAL ---
interface LyricSheetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song | null;
  album?: Album | null;
}

const LyricSheetExportModal: React.FC<LyricSheetExportModalProps> = ({
  isOpen,
  onClose,
  song,
  album
}) => {
  const [sheetFormat, setSheetFormat] = useState<'clean' | 'chords' | 'producer'>('clean');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeChords, setIncludeChords] = useState(true);
  const [highContrastPrint, setHighContrastPrint] = useState(false);
  const [estimatedBpm, setEstimatedBpm] = useState(120);
  const [musicalKey, setMusicalKey] = useState("C Major / A Minor");
  const [copied, setCopied] = useState(false);

  if (!isOpen || (!song && !album)) return null;

  const activeTitle = song ? song.title : album ? album.name : "Song Lyrics";
  const activeGenre = song ? song.genre : album?.genres?.join(', ') || "Pop";
  const activeMood = song ? song.mood : "Euphoric";
  const activeOccasion = album?.occasion || "General Release";
  const activeLanguage = song?.language || album?.language || "English";

  // Build raw text
  const rawLyrics = song
    ? (song.lyrics?.[0]?.join('\n') || "No lyrics available.")
    : (album?.songs?.map((s, i) => `[Track ${i + 1}: ${s.title}]\n${s.lyrics?.[0]?.join('\n') || ''}`).join('\n\n') || "");

  // Format lyrics with chord annotations if chords format is selected
  const formatLyricsWithChords = (text: string) => {
    const lines = text.split('\n');
    const commonChords = ["C", "G", "Am", "F", "Em", "Dm", "Bb", "D"];
    let chordIdx = 0;
    let lyricLineIdx = 0; // counts only real lyric lines (headers/blanks must not drift parity)

    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('#')) {
        return line;
      }
      if (includeChords && sheetFormat === 'chords' && lyricLineIdx % 2 === 0) {
        const chord1 = commonChords[chordIdx % commonChords.length];
        const chord2 = commonChords[(chordIdx + 1) % commonChords.length];
        chordIdx++;
        lyricLineIdx++;
        return `[ ${chord1} ]                [ ${chord2} ]\n${line}`;
      }
      lyricLineIdx++;
      return line;
    }).join('\n');
  };

  const formattedDisplayText = formatLyricsWithChords(rawLyrics);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySheet = async () => {
    try {
      const header = includeMetadata
        ? `==========================================================\nTITLE: ${activeTitle.toUpperCase()}\nGENRE: ${activeGenre} | MOOD: ${activeMood}\nOCCASION: ${activeOccasion} | LANGUAGE: ${activeLanguage}\nTEMPO: ${estimatedBpm} BPM | KEY: ${musicalKey}\n==========================================================\n\n`
        : "";
      await navigator.clipboard.writeText(header + formattedDisplayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy sheet", e);
    }
  };

  const handleDownloadFile = (ext: 'md' | 'txt' | 'json') => {
    const header = `# ${activeTitle}\n**Genre:** ${activeGenre} | **Mood:** ${activeMood} | **Language:** ${activeLanguage}\n**BPM:** ${estimatedBpm} | **Key:** ${musicalKey}\n\n---\n\n`;
    let content = header + formattedDisplayText;
    let mime = "text/plain";

    if (ext === 'json') {
      content = JSON.stringify({
        title: activeTitle,
        genre: activeGenre,
        mood: activeMood,
        occasion: activeOccasion,
        language: activeLanguage,
        bpm: estimatedBpm,
        key: musicalKey,
        lyrics: formattedDisplayText,
        song,
        album
      }, null, 2);
      mime = "application/json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTitle.replace(/\s+/g, '_').toLowerCase()}_lyric_sheet.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    generateLyricsPdf({
      title: activeTitle,
      genre: activeGenre,
      mood: activeMood,
      bpm: estimatedBpm,
      key: musicalKey,
      occasion: activeOccasion,
      language: activeLanguage,
      lyricsText: formattedDisplayText,
      includeChords: includeChords
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className={`rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] flex flex-col transition-colors ${
        highContrastPrint
          ? "bg-white text-black border border-gray-300"
          : "bg-gray-900 text-white border border-teal-500/40"
      }`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-700/80 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
              Print-Ready Export Suite
            </span>
            <h3 className={`text-xl font-black mt-1 ${highContrastPrint ? 'text-black' : 'text-white'}`}>
              ðŸŽ¼ Lyric Sheet & Lead Sheet Studio
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-lg p-2 rounded-full hover:bg-gray-800 cursor-pointer"
          >
            âœ•
          </button>
        </div>

        {/* Controls Bar */}
        <div className={`p-4 rounded-2xl border space-y-3 ${
          highContrastPrint ? "bg-gray-100 border-gray-300" : "bg-gray-800/90 border-gray-700"
        }`}>
          {/* Format Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'clean', label: 'ðŸ“ Clean Lyric Sheet', desc: 'Vocalist & Performer View' },
              { id: 'chords', label: 'ðŸŽ¸ Chord & Lead Sheet', desc: 'Chords & Bar Structure' },
              { id: 'producer', label: 'ðŸŽ›ï¸ Producer Cue Sheet', desc: 'Arrangement & BPM' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSheetFormat(f.id as any)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                  sheetFormat === f.id
                    ? "bg-teal-600 text-white shadow-md ring-1 ring-teal-400/50"
                    : "bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[9px] opacity-75 font-normal">{f.desc}</span>
              </button>
            ))}
          </div>

          {/* Sizing & Metadata Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-300">Font Scale:</span>
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] transition-all cursor-pointer ${
                    fontSize === sz
                      ? "bg-teal-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {sz === 'sm' ? 'Compact' : sz === 'base' ? 'Standard' : 'Large'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 font-semibold">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded accent-teal-400"
                />
                <span>Include Metadata Header</span>
              </label>

              {sheetFormat === 'chords' && (
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={includeChords}
                    onChange={(e) => setIncludeChords(e.target.checked)}
                    className="rounded accent-teal-400"
                  />
                  <span>Chord Cues</span>
                </label>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 font-semibold">
                <input
                  type="checkbox"
                  checked={highContrastPrint}
                  onChange={(e) => setHighContrastPrint(e.target.checked)}
                  className="rounded accent-teal-400"
                />
                <span>Print-Safe Paper Mode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Printable Sheet Canvas */}
        <div className={`p-6 rounded-2xl border flex-1 overflow-y-auto max-h-[50vh] transition-all ${
          highContrastPrint
            ? "bg-white text-black border-gray-300 shadow-inner font-serif"
            : "bg-gray-950 text-gray-200 border-gray-800 font-sans"
        }`}>
          {/* Metadata Block */}
          {includeMetadata && (
            <div className={`border-b pb-4 mb-4 space-y-1 ${
              highContrastPrint ? "border-gray-300" : "border-gray-800"
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">{activeTitle}</h2>
                <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                  highContrastPrint ? "bg-gray-200 text-black" : "bg-teal-950 text-teal-300 border border-teal-500/30"
                }`}>
                  {activeGenre}
                </span>
              </div>
              <p className="text-xs opacity-75">
                Occasion: <strong>{activeOccasion}</strong> â€¢ Mood: <strong>{activeMood}</strong> â€¢ Language: <strong>{activeLanguage}</strong>
              </p>
              <p className="text-xs opacity-75">
                Tempo: <strong>{estimatedBpm} BPM</strong> â€¢ Key: <strong>{musicalKey}</strong>
              </p>
            </div>
          )}

          {/* Lyrics Content */}
          <div className={`leading-relaxed whitespace-pre-wrap ${
            fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-lg' : 'text-sm'
          }`}>
            {parseLyricsMarkdown(formattedDisplayText)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>ðŸ“„ Download PDF</span>
            </button>
            <button
              onClick={() => handleDownloadFile('txt')}
              className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              ðŸ“¥ Download TXT
            </button>
            <button
              onClick={() => handleDownloadFile('md')}
              className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              ðŸ“„ Download Markdown
            </button>
            <button
              onClick={() => handleDownloadFile('json')}
              className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              ðŸ’¾ Download JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySheet}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-teal-300 font-bold rounded-xl text-xs transition-all border border-teal-500/30 cursor-pointer"
            >
              {copied ? "Copied Formatted Sheet!" : "ðŸ“‹ Copy Formatted Sheet"}
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              ðŸ–¨ï¸ Print Sheet View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LyricSheetExportModal;
