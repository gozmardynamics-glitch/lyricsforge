import React, { useEffect, useMemo, useState } from "react";
import { Song } from "../types";
import { parseLyricsMarkdown } from "./shared";
import { CopyButton } from "./shared";

export interface SongVersionStudioProps {
  song: Song;
  onUpdate: (songId: string, data: Partial<Song>) => void;
  onGenerateVersions?: (songId: string) => void;
  isLoading?: boolean;
  /** Compact mode for Album Songs Studio (single-column editor) */
  layout?: "cards" | "studio";
}

const emptyVersion = (): string[] => [
  "[Verse 1]",
  "(No lyrics yet — click Generate 3 Versions)",
];

/**
 * Version picker + editor for multi-version lyric drafts (V1/V2/V3).
 * Function buttons: generate, select version, edit, set primary, copy.
 */
const SongVersionStudio: React.FC<SongVersionStudioProps> = ({
  song,
  onUpdate,
  onGenerateVersions,
  isLoading = false,
  layout = "cards",
}) => {
  const versions = useMemo(() => {
    const raw = Array.isArray(song.lyrics) ? song.lyrics : [];
    return raw.map((v) => (Array.isArray(v) ? v.map((l) => String(l)) : []));
  }, [song.lyrics]);

  const primaryIdx = Math.min(song.activeLyricVersion ?? 0, Math.max(versions.length - 1, 0));
  const [selectedIdx, setSelectedIdx] = useState(primaryIdx);
  const [draftText, setDraftText] = useState(versions[selectedIdx]?.join("\n") || "");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const idx = Math.min(song.activeLyricVersion ?? selectedIdx, Math.max(versions.length - 1, 0));
    if (idx !== selectedIdx && versions.length > 0) {
      setSelectedIdx(idx);
    }
    // Re-seed editor when version list identity changes (new generation)
    if (!dirty) {
      setDraftText(versions[idx]?.join("\n") || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, song.lyrics]);

  useEffect(() => {
    if (!dirty) {
      setDraftText(versions[selectedIdx]?.join("\n") || "");
    }
  }, [selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const versionCount = versions.length;
  const flavorHints = ["Narrative Story", "Anthem / Pop Hook", "Intimate / Acoustic"];

  const persistVersions = (next: string[][], activeIdx: number, label: string) => {
    onUpdate(song.id, { lyrics: next, activeLyricVersion: activeIdx });
    setStatus(label);
    setDirty(false);
    setTimeout(() => setStatus(""), 2200);
  };

  const handleSelectVersion = (idx: number) => {
    if (idx < 0 || idx >= versions.length) return;
    setSelectedIdx(idx);
    setDraftText(versions[idx]?.join("\n") || "");
    setDirty(false);
  };

  const handleSaveEdits = () => {
    if (versions.length === 0) {
      const next = [draftText.split("\n")];
      persistVersions(next, 0, "Saved V1");
      return;
    }
    const next = versions.map((v, i) => (i === selectedIdx ? draftText.split("\n") : v));
    persistVersions(next, selectedIdx, `Saved edits to V${selectedIdx + 1}`);
  };

  const handleSetPrimary = () => {
    if (versions.length === 0) return;
    // Move selected version to front so exports/album views use it
    const selected = versions[selectedIdx] || [];
    const rest = versions.filter((_, i) => i !== selectedIdx);
    const next = [selected, ...rest];
    persistVersions(next, 0, `V${selectedIdx + 1} is now primary (V1)`);
    setSelectedIdx(0);
  };

  const handleRestoreVersion = () => {
    if (!versions[selectedIdx]) return;
    setDraftText(versions[selectedIdx].join("\n"));
    setDirty(false);
    setStatus(`Restored V${selectedIdx + 1}`);
    setTimeout(() => setStatus(""), 2000);
  };

  const handleAddBlankVersion = () => {
    const next = [...versions, emptyVersion()];
    const idx = next.length - 1;
    persistVersions(next, selectedIdx, `Added V${idx + 1}`);
    setSelectedIdx(idx);
    setDraftText(next[idx].join("\n"));
  };

  const handleDeleteVersion = () => {
    if (versions.length <= 1) {
      setStatus("Keep at least one version");
      setTimeout(() => setStatus(""), 2000);
      return;
    }
    const next = versions.filter((_, i) => i !== selectedIdx);
    const idx = Math.max(0, Math.min(selectedIdx, next.length - 1));
    persistVersions(next, idx, `Deleted V${selectedIdx + 1}`);
    setSelectedIdx(idx);
    setDraftText(next[idx]?.join("\n") || "");
  };

  const previewText = dirty ? draftText : versions[selectedIdx]?.join("\n") || draftText;

  const FunctionButton = ({
    onClick,
    disabled,
    tone = "gray",
    title,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    tone?: "gray" | "teal" | "amber" | "green" | "indigo" | "red";
    title?: string;
    children: React.ReactNode;
  }) => {
    const tones: Record<string, string> = {
      gray: "bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600",
      teal: "bg-teal-600 hover:bg-teal-500 text-white border-teal-500",
      amber: "bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/40",
      green: "bg-green-700 hover:bg-green-600 text-white border-green-600",
      indigo: "bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border-indigo-500/40",
      red: "bg-red-950/80 hover:bg-red-900 text-red-300 border-red-500/40",
    };
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${tones[tone]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="mt-4 bg-gray-900 rounded-xl border border-gray-700/80 p-4 space-y-4 animate-fade-in">
      {/* Header + primary function buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <h5 className="font-bold text-base text-teal-300 flex items-center gap-2">
            <span>Song Version Studio</span>
            <span className="text-[10px] font-normal text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
              {versionCount} version{versionCount === 1 ? "" : "s"}
              {versionCount > 0 && ` · Primary: V${primaryIdx + 1}`}
            </span>
          </h5>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Generate three drafts, pick a version below, edit lyrics, then set the one you want as primary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onGenerateVersions && (
            <FunctionButton
              tone="teal"
              onClick={() => onGenerateVersions(song.id)}
              disabled={isLoading}
              title="Generate 3 lyric versions via the Album Studio pipeline"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Generating…
                </>
              ) : (
                <>⚡ Generate 3 Versions</>
              )}
            </FunctionButton>
          )}
          <FunctionButton onClick={handleSaveEdits} tone="green" disabled={!dirty && versions.length > 0 && !draftText.trim()}>
            💾 Save Edits
          </FunctionButton>
          <FunctionButton
            onClick={handleSetPrimary}
            tone="amber"
            disabled={versionCount === 0}
            title="Move selected version to V1 (used by export & album views)"
          >
            ⭐ Set Primary
          </FunctionButton>
          <CopyButton textToCopy={previewText} label="Copy" />
        </div>
      </div>

      {/* Version function buttons list */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Versions</span>
        {(versionCount > 0 ? versions.map((_, i) => i) : [0]).map((idx) => {
          const isActive = idx === selectedIdx;
          const isPrimary = idx === primaryIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectVersion(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? "bg-teal-600 text-white border-teal-400 shadow-md"
                  : "bg-gray-800 text-teal-300 border-gray-600 hover:border-teal-500/60"
              }`}
              title={`Open Version ${idx + 1} for editing${isPrimary ? " (primary)" : ""}`}
            >
              V{idx + 1}
              {isPrimary && <span className="ml-1 text-amber-300">★</span>}
              <span className="ml-1.5 font-normal opacity-80">
                {flavorHints[idx] || `Draft ${idx + 1}`}
              </span>
            </button>
          );
        })}
        <FunctionButton onClick={handleAddBlankVersion} disabled={versionCount >= 6} title="Add another draft slot">
          ➕ Add Version
        </FunctionButton>
        <FunctionButton
          onClick={handleDeleteVersion}
          tone="red"
          disabled={versionCount <= 1}
          title="Remove selected version"
        >
          🗑 Delete V{selectedIdx + 1}
        </FunctionButton>
        <FunctionButton onClick={handleRestoreVersion} tone="indigo" title="Discard unsaved edits on selected version">
          ↩ Restore
        </FunctionButton>
      </div>

      {status && (
        <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      {/* Editor + preview */}
      <div className={`grid gap-4 ${layout === "cards" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Edit Version {selectedIdx + 1}
              {dirty && <span className="text-amber-400 ml-2 normal-case font-medium">• unsaved changes</span>}
            </label>
            <span className="text-[10px] text-gray-500 font-mono">
              {draftText.split("\n").length} lines · {draftText.length} chars
            </span>
          </div>
          <textarea
            value={draftText}
            onChange={(e) => {
              setDraftText(e.target.value);
              setDirty(true);
            }}
            spellCheck
            rows={layout === "cards" ? 16 : 20}
            className="w-full bg-gray-800 text-gray-100 p-3.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm leading-relaxed font-mono"
            placeholder={"[Verse 1]\nWrite or generate lyrics for this version…"}
          />
          <div className="flex flex-wrap gap-2">
            <FunctionButton onClick={handleSaveEdits} tone="green" disabled={!dirty}>
              💾 Save to V{selectedIdx + 1}
            </FunctionButton>
            <FunctionButton onClick={handleSetPrimary} tone="amber" disabled={versionCount === 0}>
              ⭐ Use V{selectedIdx + 1} as Primary
            </FunctionButton>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Live Preview — V{selectedIdx + 1}
          </label>
          <div className="bg-gray-800/90 p-4 rounded-xl border border-gray-700 max-h-[420px] overflow-y-auto text-sm text-gray-200 leading-relaxed">
            {previewText.trim() ? (
              parseLyricsMarkdown(previewText)
            ) : (
              <p className="italic text-gray-500">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongVersionStudio;
