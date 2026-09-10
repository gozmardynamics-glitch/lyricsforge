import React, { useState } from "react";
// --- RECENT STYLES HISTORY COMPONENT ---
const LS_RECENT_STYLES = "recent_styles_history_v1";

const DEFAULT_RECENT_STYLES = [
  { id: '1', label: 'The Weeknd - Blinding Lights (Synthwave Pop)', referenceSongTitle: 'Blinding Lights', artistStyleName: 'The Weeknd', youtubeStyleLink: 'https://youtube.com/watch?v=4NRXx6U8ABQ' },
  { id: '2', label: 'Taylor Swift - Anti-Hero (Acoustic / Indie Pop)', referenceSongTitle: 'Anti-Hero', artistStyleName: 'Taylor Swift', youtubeStyleLink: 'https://youtube.com/watch?v=b1kbLwvqugk' },
  { id: '3', label: 'Drake - Passionfruit (R&B / Afrobeats Bounce)', referenceSongTitle: 'Passionfruit', artistStyleName: 'Drake', youtubeStyleLink: 'https://youtube.com/watch?v=COz9lDCFHjw' },
  { id: '4', label: 'Billie Eilish - Bad Guy (Minimalist Dark Pop)', referenceSongTitle: 'Bad Guy', artistStyleName: 'Billie Eilish', youtubeStyleLink: 'https://youtube.com/watch?v=DyDfgMOUjCI' },
  { id: '5', label: 'Bruno Mars - Leave The Door Open (70s Funk / Soul)', referenceSongTitle: 'Leave The Door Open', artistStyleName: 'Bruno Mars / Silk Sonic', youtubeStyleLink: 'https://youtube.com/watch?v=adLGHcj_3m4' },
  { id: '6', label: 'Dua Lipa - Levitating (Disco Pop / Retro)', referenceSongTitle: 'Levitating', artistStyleName: 'Dua Lipa', youtubeStyleLink: 'https://youtube.com/watch?v=TUVcZfQe-Kw' }
];

interface RecentStylesDropdownProps {
  onSelectStyle: (style: { youtubeStyleLink?: string; referenceSongTitle?: string; artistStyleName?: string }) => void;
}

// Persist a style reference so the dropdown actually reflects real usage history
export const recordRecentStyle = (style: { youtubeStyleLink?: string; referenceSongTitle?: string; artistStyleName?: string }) => {
  try {
    const labelParts = [style.artistStyleName, style.referenceSongTitle, style.youtubeStyleLink].filter(Boolean);
    if (labelParts.length === 0) return;
    const entry = {
      id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: labelParts.join(' â€” '),
      referenceSongTitle: style.referenceSongTitle || '',
      artistStyleName: style.artistStyleName || '',
      youtubeStyleLink: style.youtubeStyleLink || ''
    };
    const raw = localStorage.getItem(LS_RECENT_STYLES);
    const current = raw ? JSON.parse(raw) : [];
    const deduped = current.filter(
      (h: any) => h.referenceSongTitle !== entry.referenceSongTitle && h.artistStyleName !== entry.artistStyleName && h.youtubeStyleLink !== entry.youtubeStyleLink
    );
    localStorage.setItem(LS_RECENT_STYLES, JSON.stringify([entry, ...deduped].slice(0, 12)));
  } catch (e) {
    console.error("Failed to save recent style history", e);
  }
};

export const RecentStylesDropdown: React.FC<RecentStylesDropdownProps> = ({ onSelectStyle }) => {
  const [history, setHistory] = useState<typeof DEFAULT_RECENT_STYLES>(() => {
    try {
      const saved = localStorage.getItem(LS_RECENT_STYLES);
      return saved ? JSON.parse(saved) : DEFAULT_RECENT_STYLES;
    } catch {
      return DEFAULT_RECENT_STYLES;
    }
  });

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const item = history.find(h => h.id === selectedId);
    if (item) {
      onSelectStyle({
        youtubeStyleLink: item.youtubeStyleLink || '',
        referenceSongTitle: item.referenceSongTitle || '',
        artistStyleName: item.artistStyleName || ''
      });
      recordRecentStyle(item);
      // Move picked item to the top so "recent" stays truthful in-session
      setHistory(prev => [item, ...prev.filter(h => h.id !== item.id)].slice(0, 12));
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center justify-between">
        <span>ðŸ•’ Recent Styles History</span>
        <span className="text-[9px] text-gray-400 font-normal">Pick past reference</span>
      </label>
      <select
        onChange={handleSelect}
        defaultValue=""
        className="w-full bg-gray-900 text-teal-200 p-2 rounded-lg border border-teal-500/40 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 font-medium cursor-pointer"
      >
        <option value="" disabled>-- Select a Previously Used Style / Artist Reference --</option>
        {history.map(item => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
};
