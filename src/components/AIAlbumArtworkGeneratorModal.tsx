import React, { useState, useEffect, useRef, useCallback } from "react";

interface AIAlbumArtworkGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle?: string;
  genre?: string;
  mood?: string;
  lyricsSnippet?: string;
  albumName?: string;
  onApplyArtwork?: (imageUrl: string) => void;
}

const AIAlbumArtworkGeneratorModal: React.FC<AIAlbumArtworkGeneratorModalProps> = ({
  isOpen,
  onClose,
  songTitle = "Midnight Echoes",
  genre = "Synthwave",
  mood = "Atmospheric",
  lyricsSnippet = "Neon lights in the twilight rain\nWalking through the memories and phantom pain",
  albumName = "Production Album",
  onApplyArtwork
}) => {
  const [titleInput, setTitleInput] = useState(songTitle);
  const [genreInput, setGenreInput] = useState(genre);
  const [moodInput, setMoodInput] = useState(mood);
  const [artStyle, setArtStyle] = useState("Vintage Vinyl & Worn Paper Sleeve");
  const [colorPalette, setColorPalette] = useState("Neon Ultraviolet & Electric Teal");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  type ArtworkSource = "ai" | "procedural";
  const [artworkSource, setArtworkSource] = useState<ArtworkSource | null>(null);
  const [artworkHistory, setArtworkHistory] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"mockup" | "flat">("mockup");
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const ART_STYLES = [
    { name: "Vintage Vinyl & Worn Paper Sleeve", desc: "Classic 12-inch LP with ring wear, analog film grain, and textured cardboard jacket" },
    { name: "Cyberpunk Neon & Holographic Noir", desc: "Gleaming chromatic reflections, rainy streetlights, futuristic typography" },
    { name: "Minimalist Swiss Typography & Bauhaus", desc: "Clean geometric grids, bold typography, negative space, elegant high art" },
    { name: "Dreamy Surrealist Watercolor & Starlight", desc: "Fluid color bleeds, cosmic nebula dust, ethereal organic textures" },
    { name: "Cinematic Dramatic Oil Painting", desc: "Deep chiaroscuro lighting, heavy brushstrokes, moody orchestral atmosphere" },
    { name: "Retro 80s Cassette & Chrome Grid", desc: "Vaporwave sunset, wireframe landscapes, laser beams, analog synth aesthetic" },
    { name: "Moody Dark Indie Noir Photography", desc: "High contrast 35mm monochrome, cinematic lens blur, raw emotive framing" },
    { name: "Psychedelic Abstract Fluid Waves", desc: "Vibrant marbled soundwaves, iridescent oil-slick swirls, hypnotic color gradients" }
  ];

  const COLOR_PALETTES = [
    "Neon Ultraviolet & Electric Teal",
    "Warm Amber Sunset & Golden Hour",
    "Dark Monochrome Noir & Silver",
    "Lush Emerald & Forest Mist",
    "Deep Midnight Cosmic Blue",
    "Pastel Retro Vaporwave Sunset",
    "Blood Red & Obsidian Black"
  ];

  // Helper to generate dynamic procedural canvas vinyl artwork fallback
  const generateProceduralArtwork = useCallback((title: string, g: string, m: string, style: string, pal: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Background base
    const bgGradient = ctx.createLinearGradient(0, 0, 800, 800);
    if (pal.includes("Neon")) {
      bgGradient.addColorStop(0, "#090d16");
      bgGradient.addColorStop(0.5, "#160d2b");
      bgGradient.addColorStop(1, "#04202c");
    } else if (pal.includes("Amber")) {
      bgGradient.addColorStop(0, "#1c0a00");
      bgGradient.addColorStop(0.5, "#3b1704");
      bgGradient.addColorStop(1, "#140500");
    } else if (pal.includes("Monochrome")) {
      bgGradient.addColorStop(0, "#111111");
      bgGradient.addColorStop(0.5, "#222222");
      bgGradient.addColorStop(1, "#0a0a0a");
    } else if (pal.includes("Emerald")) {
      bgGradient.addColorStop(0, "#04140e");
      bgGradient.addColorStop(0.5, "#0b291d");
      bgGradient.addColorStop(1, "#020a07");
    } else {
      bgGradient.addColorStop(0, "#080e21");
      bgGradient.addColorStop(0.5, "#1a1236");
      bgGradient.addColorStop(1, "#050b17");
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 800, 800);

    // Decorative soundwave / artistic circular geometry
    const centerX = 400;
    const centerY = 370;

    // Glowing outer halo
    const halo = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 320);
    if (pal.includes("Neon")) {
      halo.addColorStop(0, "rgba(20, 184, 166, 0.4)");
      halo.addColorStop(0.5, "rgba(168, 85, 247, 0.25)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else if (pal.includes("Amber")) {
      halo.addColorStop(0, "rgba(245, 158, 11, 0.5)");
      halo.addColorStop(0.5, "rgba(239, 68, 68, 0.25)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      halo.addColorStop(0, "rgba(45, 212, 191, 0.35)");
      halo.addColorStop(0.5, "rgba(99, 102, 241, 0.2)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 800, 800);

    // Concentric vinyl sound grooves
    for (let r = 80; r <= 300; r += 16) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + (r % 32 === 0 ? 0.05 : 0)})`;
      ctx.lineWidth = r % 32 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Dynamic wave curves across canvas
    ctx.beginPath();
    ctx.moveTo(80, 420);
    for (let x = 80; x <= 720; x += 20) {
      const y = 370 + Math.sin(x * 0.015) * 60 + Math.cos(x * 0.03) * 30;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = pal.includes("Amber") ? "rgba(251, 191, 36, 0.6)" : "rgba(45, 212, 191, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Geometric accent box / border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 720, 720);

    // Modern album typography
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "bold 14px sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText(`${g.toUpperCase()} • ${m.toUpperCase()}`, 70, 90);

    // Track Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px sans-serif";
    ctx.fillText(title.length > 20 ? title.substring(0, 20) + "..." : title, 70, 700);

    // Subtitle
    ctx.fillStyle = pal.includes("Amber") ? "#fbbf24" : "#2dd4bf";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`PRODUCED WITH AI LYRICIST • STEREO LP`, 70, 735);

    // Album corner badge
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("HIGH FIDELITY", 660, 90);

    return canvas.toDataURL("image/png");
  }, []);

  const handleGenerateArtwork = async () => {
    setIsGenerating(true);
    setIsSavedSuccess(false);

    const prompt = customPrompt || 
      `A stunning, world-class vinyl album cover artwork for a ${genreInput} song titled "${titleInput}". Visual Art Style: ${artStyle}. Color Palette & Mood: ${colorPalette}. Thematic inspiration from lyrics: "${lyricsSnippet.slice(0, 100)}". Minimalist, iconic graphic design, high resolution, centered composition, premium record sleeve aesthetic, 1:1 aspect ratio.`;

    const pushArtwork = (url: string, source: ArtworkSource) => {
      setArtworkSource(source);
      setArtworkUrl(url);
      setArtworkHistory(prev => [url, ...prev.filter(u => u !== url)].slice(0, 8));
    };

    try {
      // Attempt server-side Gemini image generation (requires GEMINI_API_KEY
      // in the server environment). Never fake-successes: the source label
      // always states how the artwork was produced.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      let serverImage: string | null = null;
      let serverReason = "";
      try {
        const res = await fetch("/api/generate-artwork", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.generated && typeof data.imageData === "string") {
          serverImage = `data:${data.mimeType || "image/png"};base64,${data.imageData}`;
        } else {
          serverReason = data?.reason || (res.status === 502 ? "AI image generation unavailable" : `Request failed (${res.status})`);
        }
      } catch (fetchErr: any) {
        serverReason = fetchErr?.name === "AbortError" ? "AI image request timed out" : "AI image server unreachable";
      } finally {
        clearTimeout(timer);
      }

      if (serverImage) {
        pushArtwork(serverImage, "ai");
      } else {
        // Honest fallback: procedural canvas artwork, clearly labeled as such
        console.warn("Gemini image generation unavailable, using procedural canvas engine:", serverReason);
        const fallback = generateProceduralArtwork(titleInput, genreInput, moodInput, artStyle, colorPalette);
        pushArtwork(fallback, "procedural");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial generation if none exists
  const hasAutoGeneratedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !artworkUrl && !hasAutoGeneratedRef.current) {
      hasAutoGeneratedRef.current = true;
      handleGenerateArtwork();
    }
    if (!isOpen) hasAutoGeneratedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, artworkUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!artworkUrl) return;
    const a = document.createElement("a");
    a.href = artworkUrl;
    a.download = `${titleInput.toLowerCase().replace(/[^a-z0-9]/g, '_')}_album_cover.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    if (!artworkUrl) return;
    navigator.clipboard.writeText(artworkUrl);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleSaveToProject = () => {
    if (!artworkUrl) return;
    if (onApplyArtwork) {
      onApplyArtwork(artworkUrl);
    }
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-pink-950/40 via-gray-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-xl text-white font-bold shadow-lg shadow-pink-500/20">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">AI Album Artwork Studio</h3>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold">
                  1:1 Vinyl Edition
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Generate high-resolution vinyl record cover art based on your lyrics, genre & mood
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-800">
          {/* Left Column: Visual Preview & 3D Mockup */}
          <div className="lg:col-span-6 p-6 flex flex-col items-center justify-between space-y-5 bg-gray-950/40">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setViewMode("mockup")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "mockup"
                      ? "bg-pink-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  💿 Vinyl Mockup
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("flat")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "flat"
                      ? "bg-pink-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🖼️ Flat Artwork
                </button>
              </div>

              {artworkUrl && (
                <span className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                      artworkSource === "ai"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}
                    title={
                      artworkSource === "ai"
                        ? "Generated by a Gemini image model via the server proxy"
                        : "Rendered locally on canvas — AI image generation was unavailable"
                    }
                  >
                    {artworkSource === "ai" ? "AI image (server)" : "Procedural canvas — no AI image"}
                  </span>
                  <span className="text-[11px] font-mono text-teal-400">
                    800x800 px • 1:1 Square
                  </span>
                </span>
              )}
            </div>

            {/* Display Box */}
            <div className="relative w-full aspect-square max-w-[380px] flex items-center justify-center">
              {isGenerating ? (
                <div className="w-full h-full bg-gray-900/90 rounded-2xl border border-gray-800 flex flex-col items-center justify-center space-y-3 p-6 text-center shadow-2xl">
                  <div className="w-14 h-14 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                  <h5 className="font-bold text-white text-sm">Synthesizing Visual Art...</h5>
                  <p className="text-gray-400 text-xs max-w-xs">
                    Composing {genreInput} aesthetics, vinyl sleeve textures, and typography.
                  </p>
                </div>
              ) : artworkUrl ? (
                viewMode === "mockup" ? (
                  // 3D Vinyl Sleeve Mockup Container
                  <div className="relative w-full h-full flex items-center justify-center group">
                    {/* Vinyl Record Peeking Out */}
                    <div className="absolute -right-8 w-[82%] h-[82%] rounded-full bg-gray-950 border-4 border-gray-800 shadow-2xl flex items-center justify-center transition-transform duration-700 ease-out group-hover:translate-x-6 animate-spin-slow">
                      {/* Vinyl Grooves */}
                      <div className="w-[85%] h-[85%] rounded-full border border-gray-800/80 flex items-center justify-center">
                        <div className="w-[70%] h-[70%] rounded-full border border-gray-800/80 flex items-center justify-center">
                          {/* Center Label */}
                          <div className="w-[38%] h-[38%] rounded-full bg-pink-600/90 border-2 border-white/40 flex flex-col items-center justify-center text-center p-1 shadow-inner">
                            <span className="text-[8px] font-black text-white tracking-widest uppercase">LP</span>
                            <span className="text-[6px] font-bold text-pink-200 truncate max-w-full">
                              {titleInput}
                            </span>
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-950 border border-white mt-0.5"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Album Jacket Sleeve */}
                    <div className="relative z-10 w-[84%] h-[84%] rounded-xl overflow-hidden shadow-2xl border border-gray-700/80 bg-gray-900">
                      <img
                        src={artworkUrl}
                        alt="AI Album Cover"
                        className="w-full h-full object-cover shadow-inner"
                      />
                      {/* Vinyl Sheen Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none"></div>
                    </div>
                  </div>
                ) : (
                  // Flat High-Res View
                  <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-900 group relative">
                    <img
                      src={artworkUrl}
                      alt="AI Album Cover Flat"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-gray-900 rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 text-xs p-6 text-center">
                  <span>No artwork generated yet.</span>
                </div>
              )}
            </div>

            {/* Action Buttons for Artwork */}
            <div className="flex items-center gap-2 w-full flex-wrap justify-center">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!artworkUrl || isGenerating}
                className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <span>💾 Download Cover (PNG)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToProject}
                disabled={!artworkUrl || isGenerating}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <span>{isSavedSuccess ? "✓ Applied to Track!" : "🌟 Set as Album Art"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!artworkUrl || isGenerating}
                className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl border border-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{copiedStatus ? "✓ Copied" : "📋 Copy"}</span>
              </button>
            </div>

            {/* History carousel */}
            {artworkHistory.length > 1 && (
              <div className="w-full pt-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                  Previous Variations ({artworkHistory.length})
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {artworkHistory.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setArtworkUrl(img)}
                      className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                        artworkUrl === img ? "border-pink-500 ring-2 ring-pink-500/40 scale-105" : "border-gray-700 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`History ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Customization Controls */}
          <div className="lg:col-span-6 p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Track / Album Title
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Mood
                  </label>
                  <input
                    type="text"
                    value={moodInput}
                    onChange={(e) => setMoodInput(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Visual Art Style Preset */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  🎨 Visual Art Style
                </label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-pink-300 font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {ART_STYLES.map((st) => (
                    <option key={st.name} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  🌈 Palette & Lighting
                </label>
                <select
                  value={colorPalette}
                  onChange={(e) => setColorPalette(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {COLOR_PALETTES.map((pal) => (
                    <option key={pal} value={pal}>
                      {pal}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lyrics Snippet Inspiration */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  📜 Lyric Snippet Inspiration
                </label>
                <div className="bg-gray-950/80 p-3 rounded-xl border border-gray-800 text-xs text-gray-400 italic">
                  "{lyricsSnippet || "No lyrics provided yet. Art engine uses title and genre metadata."}"
                </div>
              </div>

              {/* Custom Prompt Override */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  ✍️ Prompt Refinement (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Optional: Customize prompt specifics (e.g., add rainy reflection, vintage tape grain, chrome typography)..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500 leading-relaxed"
                ></textarea>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateArtwork}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                isGenerating
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black active:scale-[0.99]"
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Generating Vinyl Artwork...</span>
                </>
              ) : (
                <>
                  <span>✨ Generate AI Album Artwork</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAlbumArtworkGeneratorModal;
