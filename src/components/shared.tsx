import React, { useState } from "react";

// --- ACCESSIBLE LIBRARY-FREE TOOLTIP COMPONENTS ---
export const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-teal-200 text-[11px] font-medium rounded-lg border border-teal-500/40 shadow-xl whitespace-nowrap z-50 pointer-events-none animate-fade-in">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export const TooltipInfo = ({ text }: { text: string }) => (
  <Tooltip text={text}>
    <span className="ml-1.5 text-teal-400/80 hover:text-teal-300 cursor-help text-xs font-bold transition-colors">
      ℹ
    </span>
  </Tooltip>
);

export const CopyButton = ({ textToCopy, label = "Copy to Clipboard" }: { textToCopy: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-teal-300 border border-gray-600 transition-all shadow-sm active:scale-95 cursor-pointer"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export const Spinner = ({ message = "AI is processing request..." }) => (
  <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-[100] p-4 text-white animate-fade-in">
    <div className="relative flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-teal-500/30 border-t-teal-400 rounded-full animate-spin"></div>
      <span className="absolute text-xl">🎵</span>
    </div>
    <p className="mt-4 text-lg font-medium text-teal-200 text-center max-w-md">{message}</p>
  </div>
);

export const CheckmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// --- SYLLABLE COUNTER & SYNTAX-HIGHLIGHTING MARKDOWN PARSER ---

export function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const sub = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const syl = sub.match(/[aeiouy]{1,2}/g);
  return syl ? Math.max(1, syl.length) : 1;
}

export function countSyllablesInLine(line: string): number {
  const clean = line.replace(/[*_#\[\]()]/g, '').trim();
  if (!clean) return 0;
  const words = clean.split(/\s+/);
  return words.reduce((acc, w) => acc + countSyllablesInWord(w), 0);
}

export const parseLyricsMarkdown = (lyricsText: string) => {
  if (!lyricsText) return null;
  const lines = lyricsText.split('\n');
  
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    // Section headers like [Verse 1], [Chorus], [Bridge], [Intro], [Outro], [Hook], [Pre-Chorus]
    const sectionMatch = trimmed.match(/^\[(.*?)\]$/) || trimmed.match(/^#(.*)$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      let badgeColor = "bg-teal-950/80 text-teal-300 border-teal-500/50";
      if (sectionName.toLowerCase().includes('chorus')) {
        badgeColor = "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm";
      } else if (sectionName.toLowerCase().includes('bridge')) {
        badgeColor = "bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-sm";
      } else if (sectionName.toLowerCase().includes('hook') || sectionName.toLowerCase().includes('pre-chorus')) {
        badgeColor = "bg-pink-950/80 text-pink-300 border-pink-500/50 shadow-sm";
      } else if (sectionName.toLowerCase().includes('intro') || sectionName.toLowerCase().includes('outro')) {
        badgeColor = "bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-sm";
      }

      return (
        <div key={idx} className="mt-6 mb-2.5 first:mt-0 flex items-center justify-between border-b border-gray-800 pb-1.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${badgeColor}`}>
            <span>🎵</span> {sectionName}
          </span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">
            Section Header
          </span>
        </div>
      );
    }

    // Stanza spacing
    if (!trimmed) {
      return <div key={idx} className="h-4" />;
    }

    // Syntax highlighting for ad-libs/cues inside parentheses: e.g. (whisper)
    // SECURITY: escape raw HTML first — lyric lines come from AI output, pasted
    // user text, collaborators and imported JSON, so they must never be
    // interpreted as markup. Only the known-safe spans below are injected after.
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeLine = escapeHtml(trimmed);

    let formattedLine = safeLine
      .replace(/\((.*?)\)/g, '<span class="text-amber-300/90 font-medium italic bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded text-xs mr-1">($1)</span>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-teal-200 italic">$1</em>');

    const sylCount = countSyllablesInLine(trimmed);

    return (
      <div key={idx} className="flex items-center justify-between group py-1 border-b border-transparent hover:border-gray-800/80 rounded-lg px-2 transition-all hover:bg-gray-800/40">
        <p 
          className="text-gray-200 text-sm sm:text-base leading-relaxed tracking-wide font-sans hover:text-white transition-colors flex-1"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
        {sylCount > 0 && (
          <span 
            className="text-[10px] font-mono font-bold text-teal-400/90 bg-gray-950 border border-teal-500/30 px-2 py-0.5 rounded-md shadow-inner opacity-75 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-3 cursor-help flex items-center gap-1"
            title={`Real-time Syllable Count: ${sylCount} syllables in line (useful for rhythm & scansion analysis)`}
          >
            <span>♪</span> {sylCount} syl
          </span>
        )}
      </div>
    );
  });
};
