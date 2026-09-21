import React, { useState } from "react";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE, ExtendedStyleTemplate } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- STYLE TEMPLATES LIBRARY VIEW COMPONENT ---
const LS_CUSTOM_STYLE_TEMPLATES = "custom_style_templates_v2";

const DEFAULT_EXTENDED_STYLE_TEMPLATES: ExtendedStyleTemplate[] = [
  {
    id: "tpl-the-weeknd-synthwave",
    name: "80s Retro Synthwave (The Weeknd Style)",
    artistReference: "The Weeknd / Max Martin",
    description: "Driving neon synth basslines, 120-130 BPM energetic pulse, bittersweet nocturnal romantic tension, and soaring falsetto vocal hooks.",
    cadenceAndMeter: "Driving 4/4 four-on-the-floor pulse, syncopated bass groove with explosive synth crescendos.",
    rhymeDensity: "High internal rhymes with sharp end-stops (ABAB / AABB).",
    vocabularyStyle: "Neon city lights, midnight drives, emotional numbness, addictive romantic longing.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=4NRXx6U8ABQ",
    genres: ["Synthwave", "Pop", "R&B"],
    defaultRhymeScheme: "ABAB (Alternate Rhyme)",
    defaultMood: "Bittersweet & Nostalgic",
    samplePromptNotes: "Focus on 80s analog synth pads, gated reverbs, and a punchy 15-second viral chorus hook."
  },
  {
    id: "tpl-taylor-storyteller",
    name: "Billboard Pop Storyteller (Taylor Swift Style)",
    artistReference: "Taylor Swift / Jack Antonoff",
    description: "Vivid diary-style storytelling, hyper-specific sensory imagery, conversational stanzas, and an emotionally cathartic bridge section.",
    cadenceAndMeter: "Conversational, syncopated speech-rhythm building dynamic tension into a massive chorus.",
    rhymeDensity: "Intricate internal rhymes, multi-syllabic slant rhymes, ABAB verse structures.",
    vocabularyStyle: "Hyper-specific details (scents, seasons, colors, dates), relatable heartbreak, nostalgic retrospection.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=b1kbLwvqugk",
    genres: ["Pop", "Indie Pop", "Singer-Songwriter"],
    defaultRhymeScheme: "ABAB (Alternate Rhyme)",
    defaultMood: "Reflective & Introspective",
    samplePromptNotes: "Include an emotionally devastating bridge that shifts perspective or reveals the core truth."
  },
  {
    id: "tpl-drake-melodic-trap",
    name: "Melodic Trap Nocturne (Drake / Travis Scott)",
    artistReference: "Drake / 40 / Travis Scott",
    description: "Late-night moody atmosphere, 808 low-end glide, rhythmic triplet flow switches, melodic auto-tuned cadences, and introspective flexes.",
    cadenceAndMeter: "Triplet bounce with ambient reverb pauses, alternating between rapid cadences and drawn-out melodic notes.",
    rhymeDensity: "AABB couplets, repetitive chant hooks, dense multisyllabic rhymes.",
    vocabularyStyle: "Late-night calls, hotel suites, loyalty tests, nocturnal melancholy, atmospheric metaphors.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=COz9lDCFHjw",
    genres: ["Hip-Hop", "Melodic Trap", "R&B"],
    defaultRhymeScheme: "AABB (Couplets)",
    defaultMood: "Dark & Nocturnal",
    samplePromptNotes: "Use atmospheric low-pass filtered keys, 808 slides, and melodic chant refrains."
  },
  {
    id: "tpl-billie-dark-pop",
    name: "Intimate Dark Minimalist (Billie Eilish Style)",
    artistReference: "Billie Eilish / Finneas",
    description: "Whispered close-mic intimacy, sudden dynamic sub-bass drops, playful cynical wit, and eerie haunting melodies.",
    cadenceAndMeter: "Minimalist rhythmic pauses, syncopated snaps, sudden quiet-to-loud dynamic transitions.",
    rhymeDensity: "Subtle slant rhymes, assonances, unexpected metric shifts.",
    vocabularyStyle: "Nightmares, glass, shadows, cynical romantic banter, paradoxical confessions.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=DyDfgMOUjCI",
    genres: ["Dark Pop", "Alternative", "Electronic"],
    defaultRhymeScheme: "AABB (Couplets)",
    defaultMood: "Dark & Gritty",
    samplePromptNotes: "Keep arrangement minimalist with ASMR-like close vocal texture and heavy bass swells."
  },
  {
    id: "tpl-bruno-retro-funk",
    name: "70s Retro Soul & Funk (Silk Sonic / Bruno Mars)",
    artistReference: "Bruno Mars / Anderson .Paak / Silk Sonic",
    description: "Lush strings, tight brass horn sections, syncopated pocket drumming, warm electric piano chords, and irresistible romantic charm.",
    cadenceAndMeter: "Classic 70s Motown pocket groove, vocal call-and-response, smooth syncopation.",
    rhymeDensity: "AABB / AABA melodic harmonies with classic rhyming tropes.",
    vocabularyStyle: "Velvet, champagne, vintage romance, soulful promises, playful charisma.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=adLGHcj_3m4",
    genres: ["Funk", "Soul", "R&B"],
    defaultRhymeScheme: "AABB (Couplets)",
    defaultMood: "Romantic & Passionate",
    samplePromptNotes: "Emphasize horn stabs, silky smooth falsetto ad-libs, and warm analog chord progressions."
  },
  {
    id: "tpl-dua-disco-pop",
    name: "Nu-Disco Euphoria (Dua Lipa / SG Lewis)",
    artistReference: "Dua Lipa / SG Lewis",
    description: "124 BPM four-on-the-floor disco beat, funky slap bassline, shimmering string runs, and euphoric dancefloor liberation.",
    cadenceAndMeter: "High-energy 124 BPM driving groove with relentless rhythmic momentum.",
    rhymeDensity: "Punchy, fast-moving ABAB stanzas with instant singalong hooks.",
    vocabularyStyle: "Cosmic dancefloors, starlight, magnetic attraction, unapologetic freedom.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=TUVcZfQe-Kw",
    genres: ["Disco Pop", "Dance", "Electronic"],
    defaultRhymeScheme: "ABAB (Alternate Rhyme)",
    defaultMood: "Euphoric & Festival Vibe",
    samplePromptNotes: "Incorporate a funky slap bassline, bright vocoder accents, and high-energy pre-chorus builds."
  },
  {
    id: "tpl-hozier-indie-folk",
    name: "Gothic Indie Folk (Hozier / Phoebe Bridgers)",
    artistReference: "Hozier / Phoebe Bridgers / Bon Iver",
    description: "Haunting acoustic guitar fingerpicking, gospel choir undertones, literary mythological metaphors, and raw emotional resonance.",
    cadenceAndMeter: "Fluid 6/8 and 3/4 lilting rhythms with poetic pauses and acoustic crescendos.",
    rhymeDensity: "Rich assonance, slant rhymes, fluid verse structures without rigid end-stops.",
    vocabularyStyle: "Botanical, gothic romanticism, sacred devotions, earthen elements, timeless literature.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=PVjiKRfC64A",
    genres: ["Indie Folk", "Acoustic", "Blues"],
    defaultRhymeScheme: "ABCB (Ballad Stanza)",
    defaultMood: "Bittersweet & Nostalgic",
    samplePromptNotes: "Use poetic imagery comparing modern human heartbreak to ancient folklore and nature."
  },
  {
    id: "tpl-kendrick-narrative",
    name: "Conscious Narrative Hip-Hop (Kendrick Lamar)",
    artistReference: "Kendrick Lamar / Sounwave",
    description: "Complex multi-syllabic internal rhyme schemes, shifting meter flows, theatrical vocal character changes, and profound societal introspection.",
    cadenceAndMeter: "Polyrhythmic cadences, dynamic tempo switches, spoken-word interludes.",
    rhymeDensity: "Multi-layered internal and cross-line rhyme matrices (AAAA / Complex Slant).",
    vocabularyStyle: "Philosophical paradoxes, generational memoirs, urban grit, existential contemplation.",
    referenceLinkOrLyrics: "https://youtube.com/watch?v=tvTRZJ-4EyI",
    genres: ["Hip-Hop", "Jazz Rap", "Conscious"],
    defaultRhymeScheme: "AABB (Couplets)",
    defaultMood: "Inspiring & Cinematic",
    samplePromptNotes: "Feature deep multi-syllabic internal rhyming and vivid narrative character dialogues."
  }
];

interface StyleTemplatesLibraryViewProps {
  onApplyTemplateToTheme: (template: ExtendedStyleTemplate) => void;
  onApplyTemplateToAgent: (template: ExtendedStyleTemplate) => void;
}

const StyleTemplatesLibraryView: React.FC<StyleTemplatesLibraryViewProps> = ({
  onApplyTemplateToTheme,
  onApplyTemplateToAgent
}) => {
  const [templates, setTemplates] = useState<ExtendedStyleTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(LS_CUSTOM_STYLE_TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_EXTENDED_STYLE_TEMPLATES, ...parsed];
      }
    } catch (e) {
      console.error("Error loading style templates:", e);
    }
    return DEFAULT_EXTENDED_STYLE_TEMPLATES;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExtendedStyleTemplate | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ExtendedStyleTemplate>>({
    name: "",
    artistReference: "",
    description: "",
    cadenceAndMeter: "",
    rhymeDensity: "",
    vocabularyStyle: "",
    referenceLinkOrLyrics: "",
    defaultRhymeScheme: "ABAB (Alternate Rhyme)",
    defaultMood: "Bittersweet & Nostalgic",
    genres: ["Pop"],
    samplePromptNotes: ""
  });

  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      artistReference: "",
      description: "",
      cadenceAndMeter: "Driving 4/4 rhythm with building tension into explosive hooks.",
      rhymeDensity: "High internal rhymes and clean end-rhymes (ABAB).",
      vocabularyStyle: "Relatable sensory imagery and memorable hook lines.",
      referenceLinkOrLyrics: "",
      defaultRhymeScheme: "ABAB (Alternate Rhyme)",
      defaultMood: "Euphoric & Festival Vibe",
      genres: ["Pop"],
      samplePromptNotes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl: ExtendedStyleTemplate) => {
    setEditingTemplate(tpl);
    setFormData({ ...tpl });
    setIsModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert("Please enter a template name.");
      return;
    }

    if (editingTemplate) {
      // Update existing
      const updated = templates.map(t => (t.id === editingTemplate.id ? { ...t, ...formData } : t));
      setTemplates(updated);
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem(LS_CUSTOM_STYLE_TEMPLATES, JSON.stringify(customOnly));
    } else {
      // Create new
      const newTpl: ExtendedStyleTemplate = {
        id: `custom-tpl-${Date.now()}`,
        name: formData.name || "Custom Style Preset",
        artistReference: formData.artistReference || "Independent Artist",
        description: formData.description || "Custom prompt style configuration.",
        cadenceAndMeter: formData.cadenceAndMeter || "Dynamic 4/4 rhythm.",
        rhymeDensity: formData.rhymeDensity || "ABAB stanza structure.",
        vocabularyStyle: formData.vocabularyStyle || "Evocative lyric vocabulary.",
        referenceLinkOrLyrics: formData.referenceLinkOrLyrics || "",
        defaultRhymeScheme: formData.defaultRhymeScheme || "ABAB (Alternate Rhyme)",
        defaultMood: formData.defaultMood || "Bittersweet & Nostalgic",
        genres: formData.genres || ["Pop"],
        samplePromptNotes: formData.samplePromptNotes || "",
        isCustom: true
      };

      const updated = [newTpl, ...templates];
      setTemplates(updated);
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem(LS_CUSTOM_STYLE_TEMPLATES, JSON.stringify(customOnly));
    }

    setIsModalOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this custom style template?")) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem(LS_CUSTOM_STYLE_TEMPLATES, JSON.stringify(customOnly));
    }
  };

  const handleExportTemplatesJSON = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `style_templates_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplatesJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string) as ExtendedStyleTemplate[];
        if (Array.isArray(imported)) {
          // Merge imported with existing by ID
          const existingIds = new Set(templates.map(t => t.id));
          const newOnes = imported.filter(t => !existingIds.has(t.id)).map(t => ({ ...t, isCustom: true }));
          const merged = [...newOnes, ...templates];
          setTemplates(merged);
          const customOnly = merged.filter(t => t.isCustom);
          localStorage.setItem(LS_CUSTOM_STYLE_TEMPLATES, JSON.stringify(customOnly));
          alert(`Successfully imported ${newOnes.length} new style templates!`);
        }
      } catch (err) {
        console.error("Error importing templates JSON:", err);
        alert("Invalid JSON template file format.");
      }
    };
    reader.readAsText(file);
  };

  // Unique genres for filter
  const allAvailableGenres = ["All", ...Array.from(new Set(templates.flatMap(t => t.genres || [])))];

  const filteredTemplates = templates.filter(tpl => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.artistReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.vocabularyStyle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenreFilter === "All" || (tpl.genres && tpl.genres.includes(selectedGenreFilter));

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="space-y-6 animate-fade-in my-6">
      {/* Top Banner */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 border border-teal-500/30 px-2.5 py-0.5 rounded">
            Songwriting Prompt Configurations & Fingerprints
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1.5 flex items-center gap-2">
            🎨 Style Templates Library
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Save, customize, and reuse proven artist prompt styles, rhyme schemes, cadence meters, and reference tracks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>➕ New Custom Template</span>
          </button>
          <button
            onClick={handleExportTemplatesJSON}
            className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>📥 Export JSON</span>
          </button>
          <label className="px-3.5 py-2 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 hover:text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer">
            <span>📤 Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportTemplatesJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-800/90 p-4 rounded-2xl border border-gray-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by artist, title, flow rhythm, or signature..."
              className="bg-gray-900 text-xs text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 w-full pl-9"
            />
            <span className="absolute left-3 top-3 text-xs text-gray-500"></span>
          </div>
          <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">
            Showing {filteredTemplates.length} of {templates.length} Templates
          </span>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-gray-400 font-bold self-center mr-1">Filter Genre:</span>
          {allAvailableGenres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenreFilter(g)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedGenreFilter === g
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-gray-900/90 text-gray-400 hover:text-white border border-gray-700/80"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-4 hover:border-teal-500/60 transition-all flex flex-col justify-between shadow-xl group"
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 border border-teal-500/30 px-2 py-0.5 rounded">
                    {template.artistReference}
                  </span>
                  {template.isCustom && (
                    <span className="text-[9px] font-bold text-amber-300 bg-amber-950 border border-amber-500/30 px-2 py-0.5 rounded">
                      Custom ★
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {template.isCustom && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(template)}
                        className="text-gray-400 hover:text-teal-300 text-xs p-1"
                        title="Edit template"
                      >
                        
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-gray-400 hover:text-red-400 text-xs p-1"
                        title="Delete template"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                {template.name}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed">
                {template.description}
              </p>

              {/* Badges / Details */}
              <div className="bg-gray-900/90 p-3 rounded-xl border border-gray-700/80 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">
                     Cadence & Meter
                  </span>
                  <p className="text-gray-300 text-[11px] mt-0.5">{template.cadenceAndMeter}</p>
                </div>

                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                    🔗 Rhyme Scheme & Density
                  </span>
                  <p className="text-gray-300 text-[11px] mt-0.5">
                    {template.defaultRhymeScheme || "ABAB"} • {template.rhymeDensity}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    📖 Vocabulary & Tone
                  </span>
                  <p className="text-gray-300 text-[11px] mt-0.5">{template.vocabularyStyle}</p>
                </div>

                {template.referenceLinkOrLyrics && (
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                      🎥 Reference
                    </span>
                    <a
                      href={template.referenceLinkOrLyrics}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-300 hover:underline truncate block"
                    >
                      {template.referenceLinkOrLyrics}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Card Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-gray-700/80">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onApplyTemplateToTheme(template)}
                  className="py-2.5 px-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-center"
                >
                  <span>✨ Use in Theme</span>
                </button>
                <button
                  onClick={() => onApplyTemplateToAgent(template)}
                  className="py-2.5 px-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-center"
                >
                  <span>🚀 Virality Studio</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>🎨</span>
                <span>{editingTemplate ? "Edit Style Template" : "Create New Style Template"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Midnight City Synthwave Hitmaker"
                  className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Artist / Producer Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.artistReference || ""}
                    onChange={(e) => setFormData({ ...formData, artistReference: e.target.value })}
                    placeholder="e.g., The Weeknd / Max Martin"
                    className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Primary Rhyme Scheme
                  </label>
                  <select
                    value={formData.defaultRhymeScheme || "ABAB (Alternate Rhyme)"}
                    onChange={(e) => setFormData({ ...formData, defaultRhymeScheme: e.target.value })}
                    className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                  >
                    {RHYME_SCHEMES.map((rs) => (
                      <option key={rs} value={rs}>
                        {rs}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Description & Musical Atmosphere
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the mood, emotion, and soundscape of this songwriting style..."
                  className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Cadence & Meter
                  </label>
                  <input
                    type="text"
                    value={formData.cadenceAndMeter || ""}
                    onChange={(e) => setFormData({ ...formData, cadenceAndMeter: e.target.value })}
                    placeholder="e.g., 128 BPM energetic 4/4 syncopated bass groove"
                    className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Rhyme Density & Rules
                  </label>
                  <input
                    type="text"
                    value={formData.rhymeDensity || ""}
                    onChange={(e) => setFormData({ ...formData, rhymeDensity: e.target.value })}
                    placeholder="e.g., High internal rhymes, slant rhymes, repetitive hook"
                    className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Vocabulary & Lyrical Signature
                </label>
                <input
                  type="text"
                  value={formData.vocabularyStyle || ""}
                  onChange={(e) => setFormData({ ...formData, vocabularyStyle: e.target.value })}
                  placeholder="e.g., Intimate sensory imagery, midnight metaphors, diary confessions"
                  className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  YouTube or Reference Track Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.referenceLinkOrLyrics || ""}
                  onChange={(e) => setFormData({ ...formData, referenceLinkOrLyrics: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-white text-xs focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer active:scale-95"
                >
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StyleTemplatesLibraryView;
