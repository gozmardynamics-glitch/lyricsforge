import React, { useState, useEffect, useRef } from "react";
import { getActiveModelId } from "../agents/llmRegistry";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- REAL-TIME COLLABORATIVE LYRIC STUDIO (MULTI-USER CO-WRITING) ---
interface Collaborator {
  id: string;
  name: string;
  color: string;
  activeLine?: number;
  lastActive: number;
}

interface CollabRoomState {
  roomId: string;
  songTitle: string;
  genre: string;
  lyricsText: string;
  collaborators: Collaborator[];
  chatMessages: { id: string; sender: string; text: string; time: string; color: string }[];
  version: number;
}

interface CollaborativeLyricRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSong?: Song | null;
  onSaveToLocal?: (lyrics: string[][], title?: string) => void;
}

const COLLAB_COLORS = [
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#f43f5e", // Rose
  "#eab308", // Amber
  "#06b6d4", // Cyan
  "#a855f7", // Purple
  "#22c55e"  // Emerald
];

const CollaborativeLyricRoomModal: React.FC<CollaborativeLyricRoomModalProps> = ({
  isOpen,
  onClose,
  initialSong,
  onSaveToLocal
}) => {
  const [myUserId] = useState<string>(() => `user-${Math.random().toString(36).substring(2, 9)}`);
  const [roomId, setRoomId] = useState<string>(() => {
    return initialSong ? `room-${initialSong.id.slice(0, 8)}` : `room-${Math.random().toString(36).substring(2, 9)}`;
  });
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem("lyric_collab_username");
    return saved || `Writer_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [userColor] = useState<string>(() => {
    return COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
  });

  const [selectedWordToRhyme, setSelectedWordToRhyme] = useState<string>("");
  const [rhymeSuggestions, setRhymeSuggestions] = useState<{ word: string; type: string; syllables: number }[]>([]);
  const [isRhymeLoading, setIsRhymeLoading] = useState(false);
  const rhymeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced dispatch: onSelect + onKeyUp fire per keystroke — only the last
  // word change within 500 ms should trigger an LLM request.
  const debouncedFetchRhymes = (word: string) => {
    if (rhymeDebounceRef.current) clearTimeout(rhymeDebounceRef.current);
    rhymeDebounceRef.current = setTimeout(() => {
      fetchRhymeSuggestions(word);
    }, 500);
  };

  // Cancel any pending debounce on unmount so no stray LLM call fires after close
  useEffect(() => {
    return () => {
      if (rhymeDebounceRef.current) clearTimeout(rhymeDebounceRef.current);
    };
  }, []);

  // Function to extract end word of selected line or cursor line and fetch rhymes
  const handleEditorSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const text = target.value;
    const cursor = target.selectionStart;
    
    // Find current line based on cursor position
    const textBeforeCursor = text.substring(0, cursor);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const allLines = text.split('\n');
    const currentLine = allLines[lineIndex] || "";

    // Ignore headers like [Verse 1] or empty lines
    if (currentLine.startsWith('[') || currentLine.startsWith('#') || !currentLine.trim()) {
      return;
    }

    // Extract last clean word
    const cleaned = currentLine.replace(/[^\w\s']/g, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.toLowerCase() !== selectedWordToRhyme.toLowerCase()) {
      debouncedFetchRhymes(lastWord);
    }
  };

  const fetchRhymeSuggestions = async (word: string) => {
    if (!word || word.length < 2) return;
    setSelectedWordToRhyme(word);
    setIsRhymeLoading(true);

    try {
      const prompt = `You are a real-time rhyming dictionary assistant for a lyricist.
Target word: "${word}"

Provide 8 high-impact musical rhyming words for "${word}":
- 3 Perfect Rhymes
- 3 Slant / Near Rhymes
- 2 Multi-Syllable / Compound Rhymes

Return a JSON array of objects:
[
  { "word": string, "type": "Perfect" | "Slant" | "Multi", "syllables": number }
]`;

      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                type: { type: Type.STRING },
                syllables: { type: Type.NUMBER }
              },
              required: ["word", "type"]
            }
          }
        }
      });

      const parsed = JSON.parse(res.text || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRhymeSuggestions(parsed);
      }
    } catch (err) {
      console.error("Rhyme suggestion error:", err);
    } finally {
      setIsRhymeLoading(false);
    }
  };

  const insertRhymeWord = (rhymeWord: string) => {
    // Append or copy rhyme word
    navigator.clipboard.writeText(rhymeWord);
    const newText = `${lyricsText} ${rhymeWord}`;
    handleLyricsChange(newText);
  };
  const [songTitle, setSongTitle] = useState(initialSong?.title || "Co-Written Anthem");
  const [lyricsText, setLyricsText] = useState(() => {
    if (initialSong?.lyrics?.[0]) {
      return initialSong.lyrics[0].join('\n');
    }
    return `[Verse 1]\nNeon reflections on the wet asphalt\nSearching for rhythm in the steady rain\nWe made a promise that we wouldn't stall\nBreaking the silence, walking through the pain\n\n[Chorus]\nTake me higher into the sound\nWhere nothing can bring our spirits down\nUnder the starlight we are found\nLost in the chorus of this town`;
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: myUserId, name: userName, color: userColor, lastActive: Date.now() }
  ]);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string; color: string }[]>([
    { id: '1', sender: 'System Studio', text: `Welcome to Real-Time Co-Writing Room! Share the Room ID or Link to invite co-writers.`, time: 'Now', color: '#14b8a6' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [syncCount, setSyncCount] = useState(0);

  // Refs mirroring the values the channel effect needs  keeps the onmessage
  // closure and heartbeat fresh WITHOUT recreating the channel per keystroke.
  const lyricsRef = useRef(lyricsText);
  const songTitleRef = useRef(songTitle);
  const userNameRef = useRef(userName);
  const userColorRef = useRef(userColor);
  useEffect(() => { lyricsRef.current = lyricsText; }, [lyricsText]);
  useEffect(() => { songTitleRef.current = songTitle; }, [songTitle]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { userColorRef.current = userColor; }, [userColor]);

  // Initialize BroadcastChannel for instant multi-tab & multi-user browser sync
  useEffect(() => {
    if (!isOpen) return;

    localStorage.setItem("lyric_collab_username", userNameRef.current);

    try {
      const bc = new BroadcastChannel(`lyric_studio_${roomId}`);
      setChannel(bc);

      // Announce presence
      bc.postMessage({
        type: 'USER_JOINED',
        user: { id: myUserId, name: userNameRef.current, color: userColorRef.current, lastActive: Date.now() }
      });

      // Request latest state
      bc.postMessage({
        type: 'REQUEST_STATE',
        senderId: myUserId
      });

      bc.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'LYRICS_UPDATE' && data.senderId !== myUserId) {
          setLyricsText(data.lyricsText);
          if (data.songTitle) setSongTitle(data.songTitle);
          setSyncCount(c => c + 1);
        } else if (data.type === 'USER_JOINED') {
          setCollaborators(prev => {
            const filtered = prev.filter(c => c.id !== data.user.id);
            return [...filtered, data.user];
          });
          // Reply with the LATEST state (refs, not stale creation-time values)
          bc.postMessage({
            type: 'STATE_SNAPSHOT',
            lyricsText: lyricsRef.current,
            songTitle: songTitleRef.current,
            targetUserId: data.user.id
          });
        } else if (data.type === 'STATE_SNAPSHOT' && (data.targetUserId === myUserId || !data.targetUserId)) {
          if (data.lyricsText) setLyricsText(data.lyricsText);
          if (data.songTitle) setSongTitle(data.songTitle);
        } else if (data.type === 'CHAT_MESSAGE') {
          setChatMessages(prev => [...prev, data.message]);
        } else if (data.type === 'USER_HEARTBEAT') {
          setCollaborators(prev => {
            const filtered = prev.filter(c => c.id !== data.user.id);
            return [...filtered, data.user];
          });
        }
      };

      // Heartbeat every 5s
      const heartbeat = setInterval(() => {
        bc.postMessage({
          type: 'USER_HEARTBEAT',
          user: { id: myUserId, name: userNameRef.current, color: userColorRef.current, lastActive: Date.now() }
        });
      }, 5000);

      return () => {
        clearInterval(heartbeat);
        bc.close();
      };
    } catch (err) {
      console.warn("BroadcastChannel not supported or sandbox restricted", err);
    }
    // userName/userColor intentionally NOT in deps  renames propagate via the
    // 5s heartbeat; including them recreated the channel on every keystroke.
  }, [isOpen, roomId, myUserId]);

  if (!isOpen) return null;

  const handleLyricsChange = (newText: string) => {
    setLyricsText(newText);
    if (channel) {
      channel.postMessage({
        type: 'LYRICS_UPDATE',
        senderId: myUserId,
        lyricsText: newText,
        songTitle
      });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setSongTitle(newTitle);
    if (channel) {
      channel.postMessage({
        type: 'LYRICS_UPDATE',
        senderId: myUserId,
        lyricsText,
        songTitle: newTitle
      });
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: `${Date.now()}-${Math.random()}`,
      sender: userName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: userColor
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput("");

    if (channel) {
      channel.postMessage({
        type: 'CHAT_MESSAGE',
        message: newMsg
      });
    }
  };

  const handleCopyInvite = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?collabRoom=${roomId}`;
    const textToCopy = `Join my real-time lyric songwriting session!\nRoom ID: ${roomId}\nLink: ${inviteUrl}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error("Failed to copy invite:", e);
    }
  };

  const handleSaveToWorkspace = () => {
    const lines = lyricsText.split('\n');
    if (onSaveToLocal) {
      onSaveToLocal([lines], songTitle);
      alert(`Saved "${songTitle}" back to your active studio workspace!`);
    } else {
      navigator.clipboard.writeText(lyricsText);
      alert(`Copied full lyrics for "${songTitle}" to clipboard!`);
    }
  };

  const lineCount = lyricsText.split('\n').length;
  const wordCount = lyricsText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-900 border border-teal-500/50 rounded-3xl max-w-5xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                  Live Co-Writing Studio
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-950/80 px-2 py-0.5 rounded border border-green-500/30 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Real-Time Sync Active
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5">Collaborative Lyric Room</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyInvite}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? "✓ Invite Copied!" : "🔗 Share Room Invite"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg p-2 rounded-full hover:bg-gray-800 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Room Info & Active Collaborators Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-950 p-3 rounded-2xl border border-gray-800 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-semibold">Room Code:</span>
              <span className="bg-gray-900 px-2.5 py-1 rounded-lg font-mono font-bold text-teal-300 border border-gray-700">
                {roomId}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-semibold">Your Alias:</span>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-gray-900 text-white font-bold px-2 py-1 rounded-lg border border-gray-700 w-32 focus:ring-1 focus:ring-teal-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Active Collaborators Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-semibold">Active In Room:</span>
            <div className="flex items-center -space-x-1.5">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  style={{ backgroundColor: c.color }}
                  title={`${c.name} (Active)`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black border-2 border-gray-950 shadow-md"
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-gray-400 text-[11px]">({collaborators.length} co-writers)</span>
          </div>
        </div>

        {/* Main Co-Writing Canvas & Chat Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden min-h-[420px]">
          {/* Main Lyric Editor Area */}
          <div className="lg:col-span-2 flex flex-col space-y-2.5 bg-gray-950 p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-800">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Song Title..."
                className="bg-transparent text-white font-black text-base sm:text-lg focus:outline-none focus:ring-1 focus:ring-teal-400 px-2 py-1 rounded flex-1"
              />
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <span>{lineCount} lines</span>
                <span>•</span>
                <span>{wordCount} words</span>
              </div>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                value={lyricsText}
                onChange={(e) => handleLyricsChange(e.target.value)}
                onSelect={handleEditorSelect}
                onKeyUp={handleEditorSelect}
                onClick={handleEditorSelect}
                placeholder="Start writing lyrics together in real time..."
                className="w-full flex-1 bg-gray-900 text-gray-100 p-4 rounded-xl border border-gray-700/80 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              ></textarea>

              {/* Real-Time Rhyme Suggestion Ribbon */}
              <div className="mt-2 bg-gray-900/90 border border-teal-500/30 rounded-xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🎯</span>
                    <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                      Real-Time Rhymes for: <strong className="text-white font-mono">{selectedWordToRhyme || "..."}</strong>
                    </span>
                  </div>
                  {isRhymeLoading && (
                    <span className="text-[10px] text-teal-400 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></span>
                      Finding Rhymes...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
                  {rhymeSuggestions.length > 0 ? (
                    rhymeSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertRhymeWord(item.word)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-teal-600 text-gray-200 hover:text-white rounded-lg text-xs font-semibold transition-all border border-gray-700 hover:border-teal-400 flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title={`Click to copy & insert "${item.word}" (${item.type} rhyme)`}
                      >
                        <span>{item.word}</span>
                        <span className="text-[9px] opacity-75 font-normal px-1 py-0.2 rounded bg-black/40">
                          {item.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-500 italic">
                      Type in the editor or click on any line to instantly get rhyming suggestions for its ending word.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Co-Writer Real-Time Chat & Activity Log */}
          <div className="flex flex-col space-y-2 bg-gray-950 p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-black uppercase text-teal-300">💬 Co-Writer Studio Chat</span>
              <span className="text-[10px] text-gray-400">{chatMessages.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs max-h-[340px]">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="bg-gray-900 p-2.5 rounded-xl border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold" style={{ color: msg.color || '#14b8a6' }}>
                      {msg.sender}
                    </span>
                    <span className="text-gray-500 font-mono">{msg.time}</span>
                  </div>
                  <p className="text-gray-200 leading-normal">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-2 border-t border-gray-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message co-writers..."
                className="bg-gray-900 text-white text-xs p-2 rounded-xl border border-gray-700 flex-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const blob = new Blob([lyricsText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${songTitle.replace(/\s+/g, '_').toLowerCase()}_collaborative_draft.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-xs transition-all border border-gray-700 cursor-pointer"
            >
              📥 Download Draft TXT
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToWorkspace}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              💾 Save Draft to Active Workspace
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              Close Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CollaborativeLyricRoomModal;
