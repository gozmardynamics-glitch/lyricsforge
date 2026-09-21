import React, { useState } from "react";
import { DraftTrack } from "../types";
import { parseLyricsMarkdown } from "./shared";
// --- COMPARE DRAFTS MODAL COMPONENT ---
interface CompareDraftsModalProps {
  drafts: DraftTrack[];
  onClose: () => void;
  onSetMaster: (draft: DraftTrack) => void;
}

const CompareDraftsModal: React.FC<CompareDraftsModalProps> = ({
  drafts,
  onClose,
  onSetMaster
}) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(Math.min(1, drafts.length - 1));

  if (!drafts || drafts.length < 2) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center max-w-md w-full space-y-4">
          <p className="text-white text-sm">Need at least 2 draft tracks to run side-by-side comparison.</p>
          <button onClick={onClose} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs">Close</button>
        </div>
      </div>
    );
  }

  const leftTrack = drafts[leftIndex] || drafts[0];
  const rightTrack = drafts[rightIndex] || drafts[1];

  const calculateMetrics = (text: string) => {
    if (!text) return { wordCount: 0, lineCount: 0, avgSyllables: 0, rhymeDensity: 0, sentiment: 'Neutral' };
    const cleanLines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('['));
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const lineCount = cleanLines.length;
    const avgSyllables = lineCount > 0 ? Math.round((wordCount * 1.3) / lineCount) : 0;
    
    let rhymingPairs = 0;
    for (let i = 0; i < cleanLines.length - 1; i++) {
      const end1 = cleanLines[i].replace(/[^a-zA-Z]/g, '').slice(-3).toLowerCase();
      const end2 = cleanLines[i+1].replace(/[^a-zA-Z]/g, '').slice(-3).toLowerCase();
      if (end1 && end2 && (end1 === end2 || end1.slice(-2) === end2.slice(-2))) {
        rhymingPairs++;
      }
    }
    const rhymeDensity = lineCount > 1 ? Math.min(98, Math.round((rhymingPairs / (lineCount - 1)) * 100 + 48)) : 50;

    let sentiment = "High-Energy Euphoric";
    const lower = text.toLowerCase();
    if (lower.includes("rain") || lower.includes("tears") || lower.includes("cry") || lower.includes("lonely") || lower.includes("dark")) {
      sentiment = "Bittersweet & Melancholic";
    } else if (lower.includes("dance") || lower.includes("fire") || lower.includes("party") || lower.includes("wild")) {
      sentiment = "Anthemic Banger";
    } else if (lower.includes("love") || lower.includes("heart") || lower.includes("forever")) {
      sentiment = "Romantic & Intimate";
    }

    return { wordCount, lineCount, avgSyllables, rhymeDensity, sentiment };
  };

  const leftMetrics = calculateMetrics(leftTrack.lyrics);
  const rightMetrics = calculateMetrics(rightTrack.lyrics);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-teal-500/40 rounded-3xl max-w-6xl w-full p-6 space-y-6 max-h-[92vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 border border-teal-500/30 px-2.5 py-0.5 rounded">
              Side-by-Side Draft Comparison
            </span>
            <h3 className="text-xl font-black text-white mt-1">🔬 Compare Lyrical Metrics & Flow</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold p-2 hover:bg-gray-800 rounded-full cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Track Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-teal-300">Left Draft Track:</label>
            <select
              value={leftIndex}
              onChange={(e) => setLeftIndex(Number(e.target.value))}
              className="w-full bg-gray-800 text-white p-2.5 rounded-xl border border-gray-700 text-xs font-bold"
            >
              {drafts.map((d, i) => (
                <option key={d.id || i} value={i}>Draft {i + 1}: {d.title} ({d.styleNote})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-purple-300">Right Draft Track:</label>
            <select
              value={rightIndex}
              onChange={(e) => setRightIndex(Number(e.target.value))}
              className="w-full bg-gray-800 text-white p-2.5 rounded-xl border border-gray-700 text-xs font-bold"
            >
              {drafts.map((d, i) => (
                <option key={d.id || i} value={i}>Draft {i + 1}: {d.title} ({d.styleNote})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Left Column */}
          <div className="bg-gray-800/90 p-5 rounded-2xl border border-teal-500/30 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
              <div>
                <span className="text-[10px] text-teal-400 font-bold">{leftTrack.styleNote}</span>
                <h4 className="text-base font-black text-white">{leftTrack.title}</h4>
              </div>
              <span className="text-xs font-bold bg-teal-950 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                🔥 Virality {leftTrack.viralityScore}%
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Word Count</span>
                <span className="font-bold text-white text-sm">{leftMetrics.wordCount}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Line Count</span>
                <span className="font-bold text-white text-sm">{leftMetrics.lineCount}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Syllables / Line</span>
                <span className="font-bold text-teal-300 text-sm">~{leftMetrics.avgSyllables}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Rhyme Density</span>
                <span className="font-bold text-emerald-400 text-sm">{leftMetrics.rhymeDensity}%</span>
              </div>
            </div>

            <div className="text-xs text-gray-300 bg-gray-900/60 p-2 rounded-lg border border-gray-700 flex justify-between">
              <span>Emotional Sentiment:</span>
              <strong className="text-teal-300">{leftMetrics.sentiment}</strong>
            </div>

            {/* Lyrics View */}
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 max-h-80 overflow-y-auto text-xs leading-relaxed">
              {parseLyricsMarkdown(leftTrack.lyrics)}
            </div>

            <button
              onClick={() => {
                onSetMaster(leftTrack);
                onClose();
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Set Left Track as Master Version ✓
            </button>
          </div>

          {/* Right Column */}
          <div className="bg-gray-800/90 p-5 rounded-2xl border border-purple-500/30 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
              <div>
                <span className="text-[10px] text-purple-400 font-bold">{rightTrack.styleNote}</span>
                <h4 className="text-base font-black text-white">{rightTrack.title}</h4>
              </div>
              <span className="text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                🔥 Virality {rightTrack.viralityScore}%
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Word Count</span>
                <span className="font-bold text-white text-sm">{rightMetrics.wordCount}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Line Count</span>
                <span className="font-bold text-white text-sm">{rightMetrics.lineCount}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Syllables / Line</span>
                <span className="font-bold text-purple-300 text-sm">~{rightMetrics.avgSyllables}</span>
              </div>
              <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700">
                <span className="text-[9px] text-gray-400 block uppercase">Rhyme Density</span>
                <span className="font-bold text-emerald-400 text-sm">{rightMetrics.rhymeDensity}%</span>
              </div>
            </div>

            <div className="text-xs text-gray-300 bg-gray-900/60 p-2 rounded-lg border border-gray-700 flex justify-between">
              <span>Emotional Sentiment:</span>
              <strong className="text-purple-300">{rightMetrics.sentiment}</strong>
            </div>

            {/* Lyrics View */}
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 max-h-80 overflow-y-auto text-xs leading-relaxed">
              {parseLyricsMarkdown(rightTrack.lyrics)}
            </div>

            <button
              onClick={() => {
                onSetMaster(rightTrack);
                onClose();
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Set Right Track as Master Version ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CompareDraftsModal;
