import React, { useEffect, useState } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE, LS_APP_SETTINGS, AppSettings } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- SETTINGS MODAL COMPONENT ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: 'dark' | 'light';
  onToggleTheme: (mode: 'dark' | 'light') => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearWorkspace: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  onToggleTheme,
  settings,
  onUpdateSettings,
  onClearWorkspace
}) => {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.status === 200 ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: any) => { if (!cancelled) { setSessionUser(d?.authEnabled ? (d.user || "session") : null); } })
      .catch(() => { if (!cancelled) setSessionUser(null); })
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleSignOut = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* server absent */ }
    window.location.href = "/login";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700 max-w-lg w-full space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙</span>
            <h3 className="text-xl font-black text-white">Application Settings & Accessibility</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Theme Mode Toggle (Dark Studio vs High Contrast Light) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider">
            🎨 Color Theme & Display Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? "bg-gray-900 border-teal-400 text-teal-300 ring-2 ring-teal-400/30"
                  : "bg-gray-900/60 border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-2xl">🌙</span>
              <span className="text-xs font-bold">Dark Studio Mode</span>
              <span className="text-[10px] text-gray-400">Sleek dark theme for dim environments</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                themeMode === 'light'
                  ? "bg-gray-900 border-teal-400 text-teal-300 ring-2 ring-teal-400/30"
                  : "bg-gray-900/60 border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-2xl">☀</span>
              <span className="text-xs font-bold">High Contrast Light</span>
              <span className="text-[10px] text-gray-400">Clean high-contrast for long writing sessions</span>
            </button>
          </div>
        </div>

        {/* Default Rhyme Scheme Preference */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            🎼 Default Rhyme Scheme for New Songs
          </label>
          <select
            value={settings.defaultRhymeScheme}
            onChange={(e) => onUpdateSettings({ defaultRhymeScheme: e.target.value })}
            className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400 font-medium"
          >
            {RHYME_SCHEMES.map((rs) => (
              <option key={rs} value={rs}>
                {rs}
              </option>
            ))}
          </select>
        </div>

        {/* Lyric Font Size Preference */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            📖 Lyric Display Text Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sm', label: 'Compact (Small)' },
              { id: 'base', label: 'Standard (Medium)' },
              { id: 'lg', label: 'Large (Spacious)' }
            ].map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => onUpdateSettings({ lyricFontSize: size.id as any })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  settings.lyricFontSize === size.id
                    ? "bg-teal-600 text-white border-teal-400"
                    : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Save Frequency */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            💾 State Auto-Save Frequency
          </label>
          <select
            value={settings.autoSaveInterval}
            onChange={(e) => onUpdateSettings({ autoSaveInterval: Number(e.target.value) })}
            className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400 font-medium"
          >
            <option value={3}>Instant (Every 3 seconds)</option>
            <option value={10}>Normal (Every 10 seconds)</option>
            <option value={30}>Periodic (Every 30 seconds)</option>
          </select>
        </div>

        {/* Session / Password Protection */}
        <div className="pt-3 border-t border-gray-700/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-300 block">Session</span>
              <span className="text-[10px] text-gray-400">
                {!authChecked
                  ? "Checking server session"
                  : sessionUser
                    ? `Signed in as ${sessionUser} (password-protected deployment)`
                    : "No login required (server auth disabled or running locally)"}
              </span>
            </div>
            {sessionUser && (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Workspace Reset Danger Zone */}
        <div className="pt-3 border-t border-gray-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-400 block">Clear Current Workspace</span>
            <span className="text-[10px] text-gray-400">Reset active album & song drafts</span>
          </div>
          <button
            type="button"
            onClick={onClearWorkspace}
            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Reset Workspace
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
