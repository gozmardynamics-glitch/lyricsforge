import React, { useState, useEffect, useRef } from "react";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { safeExtractJSON, getActiveModelId } from "../agents/llmRegistry";
import { registerAbortJob, completeAbortJob } from "../agents/abortSupervisor";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";
import { kbDB } from "../kbDB";
import { recordRecentStyle, RecentStylesDropdown } from "./RecentStylesDropdown";
import { exportAlbumToFile, exportSongsToFile } from "./exportUtils";
import CompareDraftsModal from "./CompareDraftsModal";
import LyricsCompanionAgent from "./LyricsCompanionAgent";

// --- AUTONOMOUS VIRALITY AGENT STUDIO COMPONENT ---
const AutonomousViralityAgentStudio = ({
  stylePresets,
  album,
  onUpdateAlbum,
  onAddSongsToAlbum,
  onOpenAgentStudio
}: {
  stylePresets: StylePreset[];
  album?: Album | null;
  onUpdateAlbum?: (data: Partial<Album>) => void;
  onAddSongsToAlbum?: (newSongs: Song[]) => void;
  onOpenAgentStudio: () => void;
}) => {
  const [occasion, setOccasion] = useState("Birthday");
  const [customOccasion, setCustomOccasion] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("Euphoric & Festival Vibe");
  const [targetGenre, setTargetGenre] = useState("Pop");
  const [culturalReferences, setCulturalReferences] = useState("TikTok 15s viral hook, Y2K nostalgia, tropical synth bounce");
  const [conceptAndStory, setConceptAndStory] = useState("Celebrating turning 25 with lifelong friends, reflecting on late-night road trips, chasing sunsets, and feeling invincible.");
  const [selectedStylePresetId, setSelectedStylePresetId] = useState("");
  const [autoCriticLoop, setAutoCriticLoop] = useState(true);

  const [isExecuting, setIsExecuting] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<{ step: string; detail: string; timestamp: string }[]>([]);
  const [result, setResult] = useState<AgenticLyricResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const agentLoopAbortRef = useRef<AbortController | null>(null);

  // Abort any in-flight agent loop when the component unmounts
  useEffect(() => {
    return () => {
      agentLoopAbortRef.current?.abort();
    };
  }, []);

  const stopAgentLoop = () => {
    agentLoopAbortRef.current?.abort();
  };
  const [activeResultTab, setActiveResultTab] = useState<'lyrics' | 'production' | 'critics' | 'checklist' | 'logs' | 'activityLog'>('lyrics');
  const [savedActivityLogs, setSavedActivityLogs] = useState<any[]>([]);

  // Interactive Co-Pilot Refinement State
  const [chatPrompt, setChatPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent'; message: string; timestamp: string }[]>([]);

  // Auto-Suggest Themes State
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [isSuggestingThemes, setIsSuggestingThemes] = useState(false);

  // Additional Style Reference State
  const [youtubeStyleLink, setYoutubeStyleLink] = useState("");
  const [referenceSongTitle, setReferenceSongTitle] = useState("");
  const [artistStyleName, setArtistStyleName] = useState("");

  // Multi-Draft Selection & Merge State
  const [selectedDraftIdsForMerge, setSelectedDraftIdsForMerge] = useState<string[]>([]);
  const [isMergingDrafts, setIsMergingDrafts] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const appendLog = (step: string, detail: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setExecutionLogs(prev => [...prev, { step, detail, timestamp: timeStr }]);
  };

  const handleClearAllDrafts = () => {
    if (!result?.draftTracks || result.draftTracks.length === 0) return;
    if (confirm("Are you sure you want to clear all current generated song drafts?")) {
      setResult({ ...result, draftTracks: [] });
      setSelectedDraftIdsForMerge([]);
    }
  };

  const handleExportAllDrafts = (format: 'txt' | 'json') => {
    if (!result?.draftTracks || result.draftTracks.length === 0) return;
    const songsToExport: Song[] = result.draftTracks.map((tr, idx) => ({
      id: tr.id || `draft-${idx}`,
      title: tr.title,
      genre: targetGenre || 'Pop',
      mood: emotionalTone || 'Euphoric',
      structure: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
      rhymeScheme: 'ABAB',
      customIdeas: tr.styleNote,
      lyrics: [[tr.lyrics]],
      isApproved: false
    }));
    exportSongsToFile(songsToExport, `${(result.songTitle || 'Drafts').replace(/\s+/g, '_')}_generated_drafts`, format);
  };

  const handleMergeSelectedDrafts = async () => {
    if (!result?.draftTracks || selectedDraftIdsForMerge.length !== 2) return;
    const tracksToMerge = result.draftTracks.filter(t => selectedDraftIdsForMerge.includes(t.id));
    if (tracksToMerge.length !== 2) return;

    const [track1, track2] = tracksToMerge;
    setIsMergingDrafts(true);
    appendLog("Track Merger", `Merging Track "${track1.title}" and Track "${track2.title}" with AI...`);
    try {
      const mergePrompt = `
You are a legendary record producer merging two generated song draft tracks into a single master hybrid song.

Track 1: "${track1.title}" (${track1.styleNote})
${track1.lyrics}

Track 2: "${track2.title}" (${track2.styleNote})
${track2.lyrics}

Instructions:
1. Select the stickiest chorus hook, best verse imagery, and punchiest bridge from both tracks.
2. Blend them seamlessly into a complete master song with [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro].
3. Return JSON:
   - "mergedTitle": string
   - "mergedLyrics": string
   - "styleNote": string
   - "viralityScore": number
`;
      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: mergePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mergedTitle: { type: Type.STRING },
              mergedLyrics: { type: Type.STRING },
              styleNote: { type: Type.STRING },
              viralityScore: { type: Type.NUMBER }
            },
            required: ["mergedTitle", "mergedLyrics", "styleNote", "viralityScore"]
          }
        }
      });

      const parsed = JSON.parse(res.text || "{}");
      if (parsed.mergedLyrics && result) {
        const newMergedDraftTrack: DraftTrack = {
          id: `merged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: parsed.mergedTitle || `Hybrid Master (${track1.title} + ${track2.title})`,
          styleNote: `🔀 Hybrid Blend: ${track1.styleNote} x ${track2.styleNote}`,
          lyrics: parsed.mergedLyrics,
          viralityScore: parsed.viralityScore ?? 98
        };
        const updatedDrafts = [newMergedDraftTrack, ...(result.draftTracks || [])];
        setResult({
          ...result,
          songTitle: newMergedDraftTrack.title,
          lyrics: newMergedDraftTrack.lyrics,
          draftTracks: updatedDrafts
        });
        setSelectedDraftIdsForMerge([]);
        alert(`Successfully merged "${track1.title}" and "${track2.title}" into master hybrid track "${newMergedDraftTrack.title}"!`);
      }
    } catch (err) {
      console.error("Error merging draft tracks:", err);
      alert("Failed to merge draft tracks. Please try again.");
    } finally {
      setIsMergingDrafts(false);
    }
  };

  const handleIncludeAllDraftsInAlbum = () => {
    if (!result?.draftTracks || !onAddSongsToAlbum) return;
    const newSongs: Song[] = result.draftTracks.map((tr, idx) => ({
      id: `song-${Date.now()}-${idx}`,
      title: tr.title,
      genre: targetGenre || GENRES[0],
      mood: emotionalTone || 'Euphoric',
      structure: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
      rhymeScheme: 'ABAB (Alternate Rhyme)',
      customIdeas: tr.styleNote,
      lyrics: [[tr.lyrics]],
      isApproved: false,
      youtubeStyleLink,
      referenceSongTitle,
      artistStyleName
    }));
    onAddSongsToAlbum(newSongs);
    alert(`Added all ${newSongs.length} draft tracks to your album tracklist! Album total song count updated.`);
  };

  const handleAddSingleDraftToAlbum = (track: DraftTrack) => {
    if (!onAddSongsToAlbum) return;
    const newSong: Song = {
      id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: track.title,
      genre: targetGenre || GENRES[0],
      mood: emotionalTone || 'Euphoric',
      structure: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
      rhymeScheme: 'ABAB (Alternate Rhyme)',
      customIdeas: track.styleNote,
      lyrics: [[track.lyrics]],
      isApproved: false,
      youtubeStyleLink,
      referenceSongTitle,
      artistStyleName
    };
    onAddSongsToAlbum([newSong]);
    alert(`Added "${track.title}" to your album tracklist!`);
  };

  const handleAutoSuggestThemes = async () => {
    setIsSuggestingThemes(true);
    try {
      const prompt = `Generate 3 distinct, highly creative, viral song storyline concepts based on current pop culture, trending music hooks, and genuine human emotions. Return a JSON array of 3 strings. Each string should be 1-2 descriptive sentences outlining a unique song storyline.`;
      const res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const parsed = JSON.parse(res.text || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuggestedThemes(parsed.slice(0, 3));
      }
    } catch (err) {
      console.error("Auto suggest themes error:", err);
    } finally {
      setIsSuggestingThemes(false);
    }
  };

  // Load saved agent state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_AGENT_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.occasion) setOccasion(parsed.occasion);
        if (parsed.customOccasion) setCustomOccasion(parsed.customOccasion);
        if (parsed.emotionalTone) setEmotionalTone(parsed.emotionalTone);
        if (parsed.targetGenre) setTargetGenre(parsed.targetGenre);
        if (parsed.culturalReferences) setCulturalReferences(parsed.culturalReferences);
        if (parsed.conceptAndStory) setConceptAndStory(parsed.conceptAndStory);
        if (parsed.selectedStylePresetId) setSelectedStylePresetId(parsed.selectedStylePresetId);
        if (parsed.result) setResult(parsed.result);
        if (parsed.executionLogs) setExecutionLogs(parsed.executionLogs);
        if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
      }
    } catch (e) {
      console.error("Error loading LS_AGENT_STATE:", e);
    }
  }, []);

  // Save state to LocalStorage
  useEffect(() => {
    try {
      const stateToSave = {
        occasion,
        customOccasion,
        emotionalTone,
        targetGenre,
        culturalReferences,
        conceptAndStory,
        selectedStylePresetId,
        result,
        executionLogs,
        chatHistory
      };
      localStorage.setItem(LS_AGENT_STATE, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Error saving LS_AGENT_STATE:", e);
    }
  }, [occasion, customOccasion, emotionalTone, targetGenre, culturalReferences, conceptAndStory, selectedStylePresetId, result, executionLogs, chatHistory]);

  const activeOccasionText = occasion === "Custom Occasion" ? customOccasion : occasion;
  const activePreset = stylePresets.find(p => p.id === selectedStylePresetId);

  const handleRunAgentLoop = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conceptAndStory.trim() || isExecuting) return;

    if (youtubeStyleLink || referenceSongTitle || artistStyleName) {
      recordRecentStyle({ youtubeStyleLink, referenceSongTitle, artistStyleName });
    }

    const abortController = new AbortController();
    agentLoopAbortRef.current = abortController;
    const signal = abortController.signal;
    const supervisedJob = registerAbortJob("virality", "Autonomous Virality Orchestrator", abortController);

    setIsExecuting(true);
    setErrorMsg("");
    setExecutionLogs([]);
    setResult(null);
    setCurrentAgentStep(1);

    const logsBuffer: { step: string; detail: string; timestamp: string }[] = [];
    const appendLog = (stepName: string, detailText: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      logsBuffer.push({ step: stepName, detail: detailText, timestamp: timeStr });
      setExecutionLogs([...logsBuffer]);
    };
    const ensureActive = () => {
      if (signal.aborted) {
        throw new DOMException("Agent loop cancelled by user", "AbortError");
      }
    };

    try {
      // --- STAGE 1: OCCASION & CONTEXT ENRICHMENT ---
      ensureActive();
      appendLog("Stage 1: Input & Occasion Parser", `Interpreting occasion '${activeOccasionText}' with emotional tone '${emotionalTone}' and target genre '${targetGenre}'...`);

      const stage1Prompt = `
You are the Orchestrator Agent of an Autonomous Viral Lyric & Music Producer.
Task: Enrich this user song request into an agentic creative context.

Occasion: ${activeOccasionText}
Emotional Tone: ${emotionalTone}
Target Genre: ${targetGenre}
Cultural References: ${culturalReferences || 'Modern viral pop culture'}
Concept / Storyline: "${conceptAndStory}"
Style Preset: ${activePreset ? activePreset.name + ' (' + activePreset.artistReference + ')' : 'Standard Viral Top 100'}

Generate a JSON object with:
- "enrichedOccasionContext": string (key emotional milestones, tropes, and thematic hooks for this occasion)
- "narrativePerspective": string (e.g. 1st person intimate, group anthem, retrospective observer)
- "sensoryTargetRatio": string (guidelines for imagery e.g. neon light, rainfall, motor engine hums)
`;

      const stage1Res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: stage1Prompt,
        signal,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              enrichedOccasionContext: { type: Type.STRING },
              narrativePerspective: { type: Type.STRING },
              sensoryTargetRatio: { type: Type.STRING }
            },
            required: ["enrichedOccasionContext", "narrativePerspective", "sensoryTargetRatio"]
          }
        }
      });
      ensureActive();
      const stage1Data = safeExtractJSON(stage1Res.text || "{}", {} as any);
      appendLog("Stage 1 Complete", `Context enriched: ${stage1Data.narrativePerspective} perspective. Sensory guideline: ${stage1Data.sensoryTargetRatio}`);

      // --- STAGE 2: GLOBAL CHART RESEARCH & STYLE RETRIEVAL ---
      setCurrentAgentStep(2);
      appendLog("Stage 2: Chart & Virality Retrieval Engine", `Synthesizing chart/trend heuristics for ${targetGenre} from model knowledge  not live web data...`);

      const stage2Prompt = `
You are the Chart Trend Analysis Agent (knowledge synthesis  you have NO live web access; do not claim real-time chart scraping).
Analyze Billboard Global 200 and Spotify Viral 50 style trends from your training knowledge for genre: ${targetGenre}.

Identify key viral formulas:
1. Average line length and syllable count.
2. Hook placement (e.g. 15-second TikTok-ready earworm chorus).
3. Rhyme density and chant motifs.
4. Trending production elements.

Return JSON format with:
- "chartTrendInsight": string (summary of current top chart formulas)
- "viralHookFormula": string (structural instructions for crafting the main chorus hook)
- "syllableTargetPerLine": string (e.g. 8-10 syllables per line with syncopated stress)
`;

      const stage2Res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: stage2Prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chartTrendInsight: { type: Type.STRING },
              viralHookFormula: { type: Type.STRING },
              syllableTargetPerLine: { type: Type.STRING }
            },
            required: ["chartTrendInsight", "viralHookFormula", "syllableTargetPerLine"]
          }
        }
      });
      const stage2Data = JSON.parse(stage2Res.text || "{}");
      appendLog("Stage 2 Complete", `Trend Insight: ${stage2Data.chartTrendInsight}`);

      // --- STAGE 3: MULTI-DRAFT LYRIC GENERATION ---
      setCurrentAgentStep(3);
      appendLog("Stage 3: Multi-Draft Lyric Composition Engine", `Drafting 3 distinct song options (Viral Punch Hook, Melodic Storyteller, High-Rhythm Banger)...`);

      const stage3Prompt = `
You are a master lyric composer crafting globally viral song lyrics.

Inputs:
- Occasion: ${activeOccasionText} (${stage1Data.enrichedOccasionContext})
- Storyline: "${conceptAndStory}"
- Emotional Tone: ${emotionalTone}
- Genre: ${targetGenre}
- Chart Formula: ${stage2Data.viralHookFormula}
- Syllable Guidelines: ${stage2Data.syllableTargetPerLine}
${activePreset ? `\n- Artist Preset Influences: ${activePreset.name} (${activePreset.description})` : ''}
${youtubeStyleLink ? `\n- YouTube Style Reference Link: ${youtubeStyleLink}` : ''}
${referenceSongTitle ? `\n- Reference Song Title to Style From: ${referenceSongTitle}` : ''}
${artistStyleName ? `\n- Artist Style Reference Name: ${artistStyleName}` : ''}

Requirements:
1. Generate exactly THREE distinct draft tracks for review as options:
   - Track A ("Viral Punch Hook"): Max energy, snappy 15s TikTok hook.
   - Track B ("Melodic Storyteller"): Deep emotional imagery, intimate flow.
   - Track C ("High-Rhythm Banger"): Heavy syncopation, anthemic crowd-pleaser rhythm.
2. Return JSON:
   - "songTitle": string (primary viral catchy song title)
   - "viralHook": string (the exact 7-word core chorus earworm phrase)
   - "lyricsDraft": string (full markdown lyrics for Track A)
   - "draftTracks": array of 3 objects, each with:
     - "id": string ("track-a", "track-b", "track-c")
     - "title": string (catchy, viral song title for this draft)
     - "styleNote": string (description of style e.g. "Viral Punch Hook")
     - "lyrics": string (full markdown song lyrics with [Verse], [Chorus], [Bridge])
     - "viralityScore": number (88-98)
`;

      const stage3Res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: stage3Prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              songTitle: { type: Type.STRING },
              viralHook: { type: Type.STRING },
              lyricsDraft: { type: Type.STRING },
              draftTracks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    styleNote: { type: Type.STRING },
                    lyrics: { type: Type.STRING },
                    viralityScore: { type: Type.NUMBER }
                  },
                  required: ["id", "title", "styleNote", "lyrics", "viralityScore"]
                }
              }
            },
            required: ["songTitle", "viralHook", "lyricsDraft", "draftTracks"]
          }
        }
      });
      const stage3Data = JSON.parse(stage3Res.text || "{}");
      appendLog("Stage 3 Complete", `Drafted 3 Track Options: Track A ('${stage3Data.songTitle}'), Track B, Track C.`);

      // --- STAGE 4: 4-CRITIC EVALUATION LOOP (gated by autoCriticLoop) ---
      setCurrentAgentStep(4);
      let stage4Data: any = {
        viralityCriticScore: 0,
        viralityCritique: autoCriticLoop ? "" : "Critic loop disabled for this run.",
        literaryCriticScore: 0,
        literaryCritique: autoCriticLoop ? "" : "Critic loop disabled for this run.",
        flowCriticScore: 0,
        flowCritique: autoCriticLoop ? "" : "Critic loop disabled for this run.",
        occasionFitScore: 0,
        occasionFitCritique: autoCriticLoop ? "" : "Critic loop disabled for this run.",
        overallViralityScore: 0,
        actionableSuggestions: [] as string[]
      };

      if (autoCriticLoop) {
        appendLog("Stage 4: 4-Critic Parallel Evaluation", `Evaluating draft via Virality Critic, Literary Critic, Flow Critic & Occasion Fit Critic...`);

        const stage4Prompt = `
You are the Agentic Critic Committee evaluating song draft '${stage3Data.songTitle}'.

Song Lyrics Draft:
${stage3Data.lyricsDraft}

Viral Hook: "${stage3Data.viralHook}"
Occasion: ${activeOccasionText}
Genre: ${targetGenre}

Evaluate across 4 distinct critic perspectives:
1. Virality Critic: Is the chorus hook sticky? Quotable on social media?
2. Literary Critic: Does it avoid clichés? Is sensory imagery deep?
3. Flow & Scansion Critic: Is the rhythm natural to sing?
4. Occasion Fit Critic: Does it honor the occasion and emotional tone?

Return JSON:
- "viralityCriticScore": number (0-100)
- "viralityCritique": string
- "literaryCriticScore": number (0-100)
- "literaryCritique": string
- "flowCriticScore": number (0-100)
- "flowCritique": string
- "occasionFitScore": number (0-100)
- "occasionFitCritique": string
- "overallViralityScore": number (0-100 composite average)
- "actionableSuggestions": array of strings (top 3 ways to refine)
`;

        const stage4Res = await ai.models.generateContent({
          model: getActiveModelId(),
          contents: stage4Prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                viralityCriticScore: { type: Type.NUMBER },
                viralityCritique: { type: Type.STRING },
                literaryCriticScore: { type: Type.NUMBER },
                literaryCritique: { type: Type.STRING },
                flowCriticScore: { type: Type.NUMBER },
                flowCritique: { type: Type.STRING },
                occasionFitScore: { type: Type.NUMBER },
                occasionFitCritique: { type: Type.STRING },
                overallViralityScore: { type: Type.NUMBER },
                actionableSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: [
                "viralityCriticScore", "viralityCritique",
                "literaryCriticScore", "literaryCritique",
                "flowCriticScore", "flowCritique",
                "occasionFitScore", "occasionFitCritique",
                "overallViralityScore", "actionableSuggestions"
              ]
            }
          }
        });
        stage4Data = JSON.parse(stage4Res.text || "{}");
        appendLog("Stage 4 Complete", `Composite Virality Index: ${stage4Data.overallViralityScore}% (Virality: ${stage4Data.viralityCriticScore}%, Literary: ${stage4Data.literaryCriticScore}%, Flow: ${stage4Data.flowCriticScore}%, Occasion: ${stage4Data.occasionFitScore}%)`);
      } else {
        appendLog("Stage 4: Skipped", `4-Critic evaluation loop disabled — building production package from the draft as-is.`);
      }

      // --- STAGE 5: REFINEMENT & MUSIC PRODUCTION PACKAGE SYNTHESIS ---
      setCurrentAgentStep(5);
      appendLog("Stage 5: Music Production Package Synthesizer", `Applying critic polish & building complete production specification (BPM, Key, Instruments, Arrangement, Reference Tracks)...`);

      const stage5Prompt = `
You are the Master Producer Agent.
Refine the song lyrics based on the critic feedback, and output a complete Music Production Package.

Critic Suggestions: ${JSON.stringify(stage4Data.actionableSuggestions)}
Song Draft:
${stage3Data.lyricsDraft}

Genre: ${targetGenre}
Occasion: ${activeOccasionText}

Tasks:
1. Polish the lyrics, integrating the critic suggestions.
2. Formulate complete musical recommendations:
   - BPM & Key
   - Genre fusion description
   - 4-6 primary instruments
   - Vocal arrangement style
   - Production tips
   - 2-3 trending reference hits from Billboard/Spotify with explanations.

Return JSON:
- "polishedLyrics": string (final polished markdown lyrics)
- "finalTitle": string
- "finalHook": string
- "suggestedBpm": number
- "musicalKey": string
- "genreFusion": string
- "primaryInstrumentation": array of strings
- "vocalArrangement": string
- "productionTips": array of strings
- "referenceTracks": array of objects with "title", "artist", "reason"
`;

      const stage5Res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: stage5Prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polishedLyrics: { type: Type.STRING },
              finalTitle: { type: Type.STRING },
              finalHook: { type: Type.STRING },
              suggestedBpm: { type: Type.NUMBER },
              musicalKey: { type: Type.STRING },
              genreFusion: { type: Type.STRING },
              primaryInstrumentation: { type: Type.ARRAY, items: { type: Type.STRING } },
              vocalArrangement: { type: Type.STRING },
              productionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              referenceTracks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["title", "artist", "reason"]
                }
              }
            },
            required: [
              "polishedLyrics", "finalTitle", "finalHook", "suggestedBpm",
              "musicalKey", "genreFusion", "primaryInstrumentation",
              "vocalArrangement", "productionTips", "referenceTracks"
            ]
          }
        }
      });
      const stage5Data = JSON.parse(stage5Res.text || "{}");
      appendLog("Stage 5 Complete", `Production package generated: ${stage5Data.suggestedBpm} BPM in ${stage5Data.musicalKey}. Reference: ${stage5Data.referenceTracks?.[0]?.title || 'Billboard Hit'}`);

      // --- STAGE 6: VIRALITY CHECKLIST AUDIT & FINAL DELIVERABLE ---
      setCurrentAgentStep(6);
      appendLog("Stage 6: Virality Checklist Audit", `Testing final lyric against 7-point viral potential checklist...`);

      const stage6Prompt = `
You are the Virality Audit Inspector.
Check this final song payload against the 7-Point Virality Checklist:

Title: "${stage5Data.finalTitle}"
Viral Hook: "${stage5Data.finalHook}"
Lyrics:
${stage5Data.polishedLyrics}

Checklist criteria:
1. Is hook 7 words or less?
2. Is there a repeatable rhythmic motif?
3. What are 2 Instagram/TikTok quotable lines?
4. What is the opening 3-second attention grabber line?
5. Is the emotional arc universal?
6. Is instrumentation trending?

Return JSON:
- "hookSevenWordsOrLess": boolean
- "repeatableRhythmicMotif": boolean
- "instagramQuotableLines": array of strings (exactly 2 lines)
- "firstThreeSecondAttentionGrabber": string
- "universalEmotionalArc": boolean
- "trendingInstrumentationMatch": boolean
`;

      const stage6Res = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: stage6Prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hookSevenWordsOrLess: { type: Type.BOOLEAN },
              repeatableRhythmicMotif: { type: Type.BOOLEAN },
              instagramQuotableLines: { type: Type.ARRAY, items: { type: Type.STRING } },
              firstThreeSecondAttentionGrabber: { type: Type.STRING },
              universalEmotionalArc: { type: Type.BOOLEAN },
              trendingInstrumentationMatch: { type: Type.BOOLEAN }
            },
            required: [
              "hookSevenWordsOrLess", "repeatableRhythmicMotif",
              "instagramQuotableLines", "firstThreeSecondAttentionGrabber",
              "universalEmotionalArc", "trendingInstrumentationMatch"
            ]
          }
        }
      });
      const stage6Data = JSON.parse(stage6Res.text || "{}");
      appendLog("Stage 6 Complete", `Virality Checklist Audit Passed! All systems nominal.`);

      // Assemble final result payload
      const finalAgenticResult: AgenticLyricResult = {
        songTitle: stage5Data.finalTitle || stage3Data.songTitle,
        lyrics: stage5Data.polishedLyrics || stage3Data.lyricsDraft,
        viralHook: stage5Data.finalHook || stage3Data.viralHook,
        chartTrendInsight: stage2Data.chartTrendInsight,
        styleFingerprintUsed: activePreset ? activePreset.name : "Billboard Top 100 Formula",
        criticEvaluation: {
          viralityCritic: {
            score: stage4Data.viralityCriticScore,
            critique: stage4Data.viralityCritique,
            viralHookHighlight: stage5Data.finalHook
          },
          literaryCritic: {
            score: stage4Data.literaryCriticScore,
            critique: stage4Data.literaryCritique,
            metaphorDepth: "High sensory imagery density"
          },
          flowCritic: {
            score: stage4Data.flowCriticScore,
            critique: stage4Data.flowCritique,
            cadenceNotes: stage2Data.syllableTargetPerLine
          },
          occasionFitCritic: {
            score: stage4Data.occasionFitScore,
            critique: stage4Data.occasionFitCritique,
            themeAlignment: `100% aligned with ${activeOccasionText}`
          },
          overallViralityScore: stage4Data.overallViralityScore,
          actionableSuggestions: stage4Data.actionableSuggestions || []
        },
        musicProductionPackage: {
          suggestedBpm: stage5Data.suggestedBpm || 120,
          musicalKey: stage5Data.musicalKey || "C Major",
          genreFusion: stage5Data.genreFusion || targetGenre,
          primaryInstrumentation: stage5Data.primaryInstrumentation || ["Acoustic Guitar", "808 Bass", "Synth Pads"],
          vocalArrangement: stage5Data.vocalArrangement || "Lead vocal with layered gang harmonies on chorus",
          productionTips: stage5Data.productionTips || ["Drop full beat on bar 16", "Use vocal sidechain compression"],
          referenceTracks: stage5Data.referenceTracks || []
        },
        viralityChecklist: stage6Data,
        draftTracks: stage3Data.draftTracks || [],
        executionLog: logsBuffer,
        revisedTimes: autoCriticLoop ? 1 : 0,
        timestamp: Date.now()
      };
      setResult(finalAgenticResult);
      setActiveResultTab('lyrics');

      // Persist Activity Log to IndexedDB
      kbDB.saveActivityLog(`log_${finalAgenticResult.timestamp}`, {
        id: `log_${finalAgenticResult.timestamp}`,
        title: finalAgenticResult.songTitle,
        occasion: activeOccasionText,
        genre: targetGenre,
        viralityScore: finalAgenticResult.criticEvaluation.overallViralityScore,
        result: finalAgenticResult,
        timestamp: finalAgenticResult.timestamp
      });
    } catch (err: any) {
      if (err?.name === "AbortError" || agentLoopAbortRef.current?.signal.aborted) {
        setErrorMsg("Agent loop cancelled.");
        appendLog("Cancelled", "Agent loop stopped by user.");
      } else {
        console.error("Agentic Loop Error:", err);
        setErrorMsg(err?.message || "Failed to complete autonomous agent loop. Please try again.");
      }
    } finally {
      completeAbortJob(supervisedJob.id);
      if (agentLoopAbortRef.current === abortController) agentLoopAbortRef.current = null;
      setIsExecuting(false);
      setCurrentAgentStep(0);
    }
  };

  // Interactive Co-Pilot Refinement Handler
  const handleRefineWithAgent = async (instructionText?: string): Promise<boolean> => {
    const promptToUse = instructionText || chatPrompt;
    if (!promptToUse.trim() || !result || isRefining) return false;

    setIsRefining(true);
    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedHistory = [...chatHistory, { sender: 'user' as const, message: promptToUse, timestamp: userMsgTime }];
    setChatHistory(updatedHistory);
    setChatPrompt("");

    try {
      const refinementPrompt = `
You are the Autonomous Orchestrator Agent refining an existing viral song payload based on direct user chat feedback.

Current Song Payload:
Title: "${result.songTitle}"
Viral Hook: "${result.viralHook}"
Current Lyrics:
${result.lyrics}

Music Package:
BPM: ${result.musicProductionPackage.suggestedBpm}
Key: ${result.musicProductionPackage.musicalKey}
Genre Fusion: ${result.musicProductionPackage.genreFusion}

User's Refinement Request: "${promptToUse}"

Tasks:
1. Revise the lyrics and song title/hook as requested by the user, maintaining high sensory imagery and rhyme density.
2. Adjust BPM, key, instrumentation, or vocal arrangement if the user asked for musical/tempo changes.
3. Re-evaluate the virality score (0-100) and critic critiques after incorporating changes.

Return JSON:
- "songTitle": string
- "viralHook": string
- "lyrics": string (markdown formatted lyrics)
- "suggestedBpm": number
- "musicalKey": string
- "genreFusion": string
- "primaryInstrumentation": array of strings
- "agentResponseMessage": string (polite, concise confirmation explaining the precise changes made)
- "overallViralityScore": number
`;

      const refRes = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: refinementPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              songTitle: { type: Type.STRING },
              viralHook: { type: Type.STRING },
              lyrics: { type: Type.STRING },
              suggestedBpm: { type: Type.NUMBER },
              musicalKey: { type: Type.STRING },
              genreFusion: { type: Type.STRING },
              primaryInstrumentation: { type: Type.ARRAY, items: { type: Type.STRING } },
              agentResponseMessage: { type: Type.STRING },
              overallViralityScore: { type: Type.NUMBER }
            },
            required: ["songTitle", "viralHook", "lyrics", "suggestedBpm", "musicalKey", "genreFusion", "agentResponseMessage", "overallViralityScore"]
          }
        }
      });

      const refData = JSON.parse(refRes.text || "{}");
      const agentMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Update Result
      setResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          songTitle: refData.songTitle || prev.songTitle,
          viralHook: refData.viralHook || prev.viralHook,
          lyrics: refData.lyrics || prev.lyrics,
          revisedTimes: prev.revisedTimes + 1,
          criticEvaluation: {
            ...prev.criticEvaluation,
            overallViralityScore: refData.overallViralityScore ?? prev.criticEvaluation.overallViralityScore
          },
          musicProductionPackage: {
            ...prev.musicProductionPackage,
            suggestedBpm: refData.suggestedBpm || prev.musicProductionPackage.suggestedBpm,
            musicalKey: refData.musicalKey || prev.musicProductionPackage.musicalKey,
            genreFusion: refData.genreFusion || prev.musicProductionPackage.genreFusion,
            primaryInstrumentation: refData.primaryInstrumentation || prev.musicProductionPackage.primaryInstrumentation
          },
          executionLog: [
            ...prev.executionLog,
            { step: `User Refinement #${prev.revisedTimes + 1}`, detail: `Prompt: "${promptToUse}" -> ${refData.agentResponseMessage}`, timestamp: agentMsgTime }
          ]
        };
      });

      setChatHistory([
        ...updatedHistory,
        { sender: 'agent', message: refData.agentResponseMessage || "Refinement applied successfully!", timestamp: agentMsgTime }
      ]);
      return true;
    } catch (e) {
      console.error("Refinement error:", e);
      setChatHistory([
        ...updatedHistory,
        { sender: 'agent', message: "Sorry, I ran into an error refining the song. Please try again.", timestamp: userMsgTime }
      ]);
      return false;
    } finally {
      setIsRefining(false);
    }
  };

  const textToCopy = result
    ? `🎵 ${result.songTitle}\n🔥 Viral Hook: "${result.viralHook}"\n📊 Virality Index: ${result.criticEvaluation.overallViralityScore}%\n🎧 Music Specs: ${result.musicProductionPackage.suggestedBpm} BPM | ${result.musicProductionPackage.musicalKey} | ${result.musicProductionPackage.genreFusion}\n\n${result.lyrics}`
    : "";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner Header */}
      <div className="bg-gradient-to-r from-gray-900 via-teal-950 to-gray-900 p-6 md:p-8 rounded-3xl border border-teal-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
          🚀
        </div>

        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-black uppercase tracking-wider rounded-full">
              Autonomous Agentic Orchestrator v2.5
            </span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full">
              Self-Critiquing Loop
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Autonomous Hit Lyric & Virality Engine
          </h2>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Researches chart trends, extracts winning style fingerprints, drafts multi-perspective lyrics with sensory imagery, runs a 4-critic evaluation loop, and delivers a complete music production package.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-teal-300">
            <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> Occasion Parser</span>
            <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> Global Chart Scraper</span>
            <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> 4-Critic Loop</span>
            <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> Production Specs (BPM/Key)</span>
          </div>
        </div>
      </div>

      {/* Input Form & Agentic Control Card */}
      <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎯</span> Configure Agent Objectives
            </h3>
            <p className="text-xs text-gray-400">Set the occasion, mood, cultural references, and story concept.</p>
          </div>

          <button
            type="button"
            onClick={onOpenAgentStudio}
            className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-teal-300 border border-gray-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <span>📚 Manage Style Presets ({stylePresets.length})</span>
          </button>
        </div>

        <form onSubmit={handleRunAgentLoop} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Occasion */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                <span>Occasion / Milestone</span>
                <TooltipInfo text="Categorizes the thematic event (Birthday, Wedding, Breakup) to steer vocabulary and emotional resonance." />
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
              >
                {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Custom Occasion input */}
            {occasion === "Custom Occasion" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                  <span>Specify Custom Occasion</span>
                  <TooltipInfo text="Type any unique milestone like Graduation, Retirement, Championship, or Anniversary." />
                </label>
                <input
                  type="text"
                  value={customOccasion}
                  onChange={(e) => setCustomOccasion(e.target.value)}
                  placeholder="e.g., Graduation / Retirement / Championship"
                  className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                />
              </div>
            ) : (
              /* Emotional Tone */
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                  <span>Emotional Tone</span>
                  <TooltipInfo text="Sets the acoustic mood, chord progression key, and intensity level for the song." />
                </label>
                <select
                  value={emotionalTone}
                  onChange={(e) => setEmotionalTone(e.target.value)}
                  className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
                >
                  {EMOTIONAL_MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Target Genre */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                <span>Target Genre</span>
                <TooltipInfo text="Guides syllable scansion, syncopation rhythm, and instrumental arrangement specs." />
              </label>
              <select
                value={targetGenre}
                onChange={(e) => setTargetGenre(e.target.value)}
                className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
              >
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cultural References & Buzzwords */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                <span>Cultural Buzzwords & Vibe References</span>
                <TooltipInfo text="Include trending keywords, slang, TikTok audio concepts, or cultural callbacks." />
              </label>
              <input
                type="text"
                value={culturalReferences}
                onChange={(e) => setCulturalReferences(e.target.value)}
                placeholder="e.g., TikTok 15s chorus, Y2K nostalgia, synth wave bounce"
                className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
              />
            </div>

            {/* Style Preset Influence */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center">
                <span>Artist Style Influence Preset</span>
                <TooltipInfo text="Select or customize an artist fingerprint for rhyming structure, metaphor density, and vocal delivery." />
              </label>
              <select
                value={selectedStylePresetId}
                onChange={(e) => setSelectedStylePresetId(e.target.value)}
                className="w-full bg-gray-900 text-teal-300 p-3 rounded-lg border border-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium"
              >
                <option value="">Standard Billboard Formula (Default)</option>
                {stylePresets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Style Reference Link / Track / Artist Inputs */}
          <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/80">
            <RecentStylesDropdown
              onSelectStyle={({ youtubeStyleLink, referenceSongTitle, artistStyleName }) => {
                if (youtubeStyleLink) setYoutubeStyleLink(youtubeStyleLink);
                if (referenceSongTitle) setReferenceSongTitle(referenceSongTitle);
                if (artistStyleName) setArtistStyleName(artistStyleName);
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <span>🎥 YouTube Style Link</span>
                  <TooltipInfo text="Paste a YouTube URL to reference cadence, beat bounce, or arrangement style." />
                </label>
                <input
                  type="url"
                  value={youtubeStyleLink}
                  onChange={(e) => setYoutubeStyleLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-900 text-gray-200 p-2.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <span>🎵 Song Title Reference</span>
                  <TooltipInfo text="Specific hit song to emulate rhyme scheme and structure from." />
                </label>
                <input
                  type="text"
                  value={referenceSongTitle}
                  onChange={(e) => setReferenceSongTitle(e.target.value)}
                  placeholder="e.g., As It Was, Blinding Lights..."
                  className="w-full bg-gray-900 text-gray-200 p-2.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <span>🎤 Artist Style Name</span>
                  <TooltipInfo text="Specific artist whose vocal delivery, flow, or lyrical tropes to channel." />
                </label>
                <input
                  type="text"
                  value={artistStyleName}
                  onChange={(e) => setArtistStyleName(e.target.value)}
                  placeholder="e.g., Billie Eilish, Drake, Taylor Swift..."
                  className="w-full bg-gray-900 text-gray-200 p-2.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Storyline & Concept */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center">
                <span>Detailed Storyline Concept & Narrative Ideas</span> <span className="text-teal-400 ml-1">*</span>
                <TooltipInfo text="Detail specific names, places, memories, or metaphors to ground the lyrics in real emotion." />
              </label>

              <button
                type="button"
                onClick={handleAutoSuggestThemes}
                disabled={isSuggestingThemes}
                className="px-3 py-1.5 bg-teal-950/90 hover:bg-teal-900 text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                {isSuggestingThemes ? (
                  <>
                    <span className="w-3 h-3 border-2 border-teal-400/30 border-t-teal-300 rounded-full animate-spin"></span>
                    <span>Brainstorming...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Auto-Suggest 3 Trending Themes</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggested Themes Chips */}
            {suggestedThemes.length > 0 && (
              <div className="bg-gray-900/90 p-3 rounded-xl border border-teal-500/30 space-y-2 animate-fade-in">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1">
                  💡 Select a Trending AI Suggestion to populate your concept:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestedThemes.map((st, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setConceptAndStory(st)}
                      className="text-left text-xs text-gray-200 bg-gray-800/80 hover:bg-teal-950/80 hover:text-teal-200 p-2.5 rounded-lg border border-gray-700/80 hover:border-teal-500/40 transition-all cursor-pointer font-medium"
                    >
                      <strong className="text-teal-400 mr-1.5">Option {i + 1}:</strong> {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={conceptAndStory}
              onChange={(e) => setConceptAndStory(e.target.value)}
              placeholder="Describe the central story, specific memories, or emotional journey you want the lyrics to capture..."
              rows={4}
              required
              className="w-full bg-gray-900 text-gray-100 p-4 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm leading-relaxed"
            />
          </div>

          {/* Auto-Critic Loop Toggle */}
          <div className="flex items-center gap-3 bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/80">
            <input
              type="checkbox"
              id="autoCritic"
              checked={autoCriticLoop}
              onChange={(e) => setAutoCriticLoop(e.target.checked)}
              className="w-4 h-4 text-teal-500 rounded border-gray-700 focus:ring-teal-400 bg-gray-800 cursor-pointer"
            />
            <label htmlFor="autoCritic" className="text-xs text-gray-200 cursor-pointer select-none font-medium">
              <strong className="text-teal-300">Enable 4-Agent Critique & Auto-Refinement Loop:</strong> Runs parallel Virality, Literary, Flow & Occasion Fit critics to score and polish the draft automatically.
            </label>
          </div>

          {/* Submit Action Button with Tooltip */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Tooltip text="Triggers the 6-stage TaskOrchestrator pipeline: research, outline, drafting, 4-critic loop, production package, & virality scoring">
              <button
                type="submit"
                disabled={isExecuting || !conceptAndStory.trim()}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-xl ${
                  isExecuting || !conceptAndStory.trim()
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 cursor-pointer active:scale-[0.99]"
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Executing Stage {currentAgentStep} of 6 in Agentic Orchestrator...</span>
                </>
              ) : (
                <>
                  <span>🚀 Launch Autonomous Agentic Orchestrator</span>
                </>
              )}
            </button>
          </Tooltip>
          {isExecuting && (
            <button
              type="button"
              onClick={stopAgentLoop}
              className="sm:w-40 py-4 px-4 rounded-2xl font-bold text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-500/50 transition-all cursor-pointer"
            >
              Stop
            </button>
          )}
        </div>
        </form>

        {errorMsg && (
          <div className="p-4 bg-red-900/40 border border-red-700/60 rounded-xl text-red-200 text-sm">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Live Agentic Execution Feed */}
      {isExecuting && (
        <div className="bg-gray-800 p-6 rounded-2xl border border-teal-500/40 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
              Autonomous Agent Live Execution Feed
            </h4>
            <span className="text-xs font-mono text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2.5 py-1 rounded">
              Stage {currentAgentStep} / 6 Active
            </span>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-700">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${(currentAgentStep / 6) * 100}%` }}
            ></div>
          </div>

          {/* Logs Feed */}
          <div className="bg-black/70 p-4 rounded-xl border border-gray-800 font-mono text-xs text-gray-300 max-h-48 overflow-y-auto space-y-2">
            {executionLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-gray-500 text-[10px] whitespace-nowrap">{log.timestamp}</span>
                <span className="text-teal-400 font-bold whitespace-nowrap">[{log.step}]:</span>
                <span className="text-gray-200">{log.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agentic Output Dashboard */}
      {result && !isExecuting && (
        <div className="bg-gray-800 p-6 md:p-8 rounded-3xl border border-teal-500/50 shadow-2xl space-y-6 animate-fade-in">
          {/* Dashboard Header Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-teal-950 to-gray-900 p-6 rounded-2xl border border-gray-700/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2.5 py-0.5 rounded">
                  Agentic Result Payload
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  Refined {result.revisedTimes}x
                </span>
              </div>

              <h3 className="text-3xl font-black text-white flex items-center gap-2">
                <span className="text-teal-400">🎵</span>
                <input
                  type="text"
                  value={result.songTitle}
                  onChange={(e) => setResult({ ...result, songTitle: e.target.value })}
                  className="bg-transparent border-b border-gray-700/80 hover:border-teal-400 focus:border-teal-400 focus:outline-none p-1 transition-all text-white font-black text-2xl md:text-3xl"
                  title="Click to edit master song title"
                />
              </h3>

              <p className="text-xs text-gray-300 flex items-center gap-2">
                <span>🔥 <strong className="text-white">Viral Hook:</strong> "{result.viralHook}"</span>
              </p>
            </div>

            {/* Composite Virality Gauge Badge */}
            <div className="flex flex-col items-center md:items-end justify-center bg-gray-900/90 p-4 rounded-xl border border-teal-500/30">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Virality Index Score</span>
              <span className="text-4xl font-black text-teal-400 mt-1">
                {result.criticEvaluation.overallViralityScore}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded mt-1">
                {result.criticEvaluation.overallViralityScore >= 90 ? "🔥 Billboard Top 10 Potential" : "✨ High Viral Appeal"}
              </span>
            </div>
          </div>

          {/* Results Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-3">
            <button
              onClick={() => setActiveResultTab('lyrics')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'lyrics' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
               Song Lyrics
            </button>

            <button
              onClick={() => setActiveResultTab('production')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'production' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              🎧 Music Production Specs
            </button>

            <button
              onClick={() => setActiveResultTab('critics')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'critics' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              🕵 4-Critic Evaluation Matrix
            </button>

            <button
              onClick={() => setActiveResultTab('checklist')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'checklist' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              ✅ Virality Audit Checklist
            </button>

            <button
              onClick={() => setActiveResultTab('logs')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'logs' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              🧠 Agent Decision Logs ({result.executionLog.length})
            </button>

            <button
              onClick={async () => {
                setActiveResultTab('activityLog');
                const logs = await kbDB.getActivityLogs();
                setSavedActivityLogs(logs);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeResultTab === 'activityLog' ? "bg-teal-600 text-white shadow-md" : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              📜 Activity Log & Sessions
            </button>
          </div>

          {/* TAB 1: LYRICS & 3-DRAFT TRACK REVIEW */}
          {activeResultTab === 'lyrics' && (
            <div className="space-y-8 animate-fade-in">
              {/* 3 Generated Draft Tracks Review Section */}
              {result.draftTracks && result.draftTracks.length > 0 && (
                <div className="space-y-4 bg-gray-900/80 p-5 md:p-6 rounded-2xl border border-teal-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 border border-teal-500/30 px-2 py-0.5 rounded">
                        Multi-Track Draft Review Studio
                      </span>
                      <h4 className="text-lg font-black text-white mt-1">3 Generated Track Options</h4>
                      <p className="text-xs text-gray-400">Review distinct style variations, merge two tracks, or include all in your album.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleMergeSelectedDrafts}
                        disabled={selectedDraftIdsForMerge.length !== 2 || isMergingDrafts}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                          selectedDraftIdsForMerge.length === 2 && !isMergingDrafts
                            ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95"
                            : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                        }`}
                        title="Select exactly 2 track checkboxes below to merge them into a hybrid master song"
                      >
                        {isMergingDrafts ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Merging AI Tracks...</span>
                          </>
                        ) : (
                          <>
                            <span>🔀 Merge 2 Selected ({selectedDraftIdsForMerge.length}/2)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setIsCompareModalOpen(true)}
                        className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Compare 2 draft tracks side-by-side with metrics"
                      >
                        <span>🔬 Compare Drafts</span>
                      </button>

                      {onAddSongsToAlbum && (
                        <button
                          onClick={handleIncludeAllDraftsInAlbum}
                          className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                          title="Add all 3 generated draft tracks as new songs to your album tracklist"
                        >
                          <span>➕ Add All 3 to Album</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleExportAllDrafts('txt')}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Export all generated drafts as TXT"
                      >
                        <span>📥 Export TXT</span>
                      </button>

                      <button
                        onClick={() => handleExportAllDrafts('json')}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Export all generated drafts as JSON"
                      >
                        <span>📄 Export JSON</span>
                      </button>

                      <button
                        onClick={handleClearAllDrafts}
                        className="px-3 py-2 bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Clear all generated drafts with 1 click"
                      >
                        <span>🗑 Clear All</span>
                      </button>
                    </div>
                  </div>

                  {/* Draft Tracks Cards Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {result.draftTracks.map((draftTrack, idx) => {
                      const isSelectedForMerge = selectedDraftIdsForMerge.includes(draftTrack.id);
                      const isCurrentMaster = result.songTitle === draftTrack.title || result.lyrics === draftTrack.lyrics;

                      return (
                        <div
                          key={draftTrack.id || idx}
                          className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                            isCurrentMaster
                              ? "bg-teal-950/70 border-teal-400 shadow-lg shadow-teal-950/50"
                              : isSelectedForMerge
                              ? "bg-purple-950/60 border-purple-500"
                              : "bg-gray-800/90 hover:bg-gray-800 border-gray-700"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-300 hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={isSelectedForMerge}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (selectedDraftIdsForMerge.length < 2) {
                                        setSelectedDraftIdsForMerge([...selectedDraftIdsForMerge, draftTrack.id]);
                                      } else {
                                        alert("You can select up to 2 tracks to merge at a time.");
                                      }
                                    } else {
                                      setSelectedDraftIdsForMerge(selectedDraftIdsForMerge.filter(id => id !== draftTrack.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-900 border-gray-700"
                                />
                                <span className="text-[10px] uppercase font-mono text-gray-400">Select to Merge</span>
                              </label>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                                🔥 Virality {draftTrack.viralityScore ?? 95}%
                              </span>
                            </div>

                            {/* Editable Draft Track Title */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-teal-400 font-bold block">{draftTrack.styleNote}</span>
                              <input
                                type="text"
                                value={draftTrack.title}
                                onChange={(e) => {
                                  const updatedDrafts = (result.draftTracks || []).map(dt =>
                                    dt.id === draftTrack.id ? { ...dt, title: e.target.value } : dt
                                  );
                                  setResult({ ...result, draftTracks: updatedDrafts });
                                }}
                                className="w-full font-bold text-base text-white bg-transparent border-b border-gray-700 hover:border-teal-400 focus:border-teal-400 focus:outline-none py-0.5"
                                title="Click to edit track title"
                              />
                            </div>

                            {/* Lyrics Preview Box */}
                            <div className="bg-gray-900/90 p-3 rounded-lg border border-gray-700/80 max-h-56 overflow-y-auto text-xs">
                              {parseLyricsMarkdown(draftTrack.lyrics)}
                            </div>
                          </div>

                          {/* Track Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-700/60">
                            <button
                              onClick={() => {
                                setResult({
                                  ...result,
                                  songTitle: draftTrack.title,
                                  lyrics: draftTrack.lyrics
                                });
                              }}
                              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                                isCurrentMaster
                                  ? "bg-teal-500 text-gray-950 shadow-md font-black"
                                  : "bg-gray-700 hover:bg-teal-600 text-gray-200 hover:text-white"
                              }`}
                            >
                              {isCurrentMaster ? "Active Master Track ✓" : "Set as Master Track"}
                            </button>

                            {onAddSongsToAlbum && (
                              <button
                                onClick={() => handleAddSingleDraftToAlbum(draftTrack)}
                                title="Add this specific track to your album tracklist"
                                className="py-2 px-2.5 bg-gray-700 hover:bg-emerald-600 text-gray-200 hover:text-white rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer"
                              >
                                ➕ Album
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Master Track Lyrics Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-teal-300 uppercase tracking-wider">Active Master Song Lyrics</h4>
                  <CopyButton textToCopy={textToCopy} label="Copy Complete Lyrics & Music Package" />
                </div>

                <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-700/80 max-h-[600px] overflow-y-auto">
                  {parseLyricsMarkdown(result.lyrics)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MUSIC PRODUCTION PACKAGE */}
          {activeResultTab === 'production' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-700">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Tempo</span>
                  <p className="text-2xl font-black text-white mt-1">{result.musicProductionPackage.suggestedBpm} BPM</p>
                </div>

                <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-700">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Musical Key</span>
                  <p className="text-2xl font-black text-teal-400 mt-1">{result.musicProductionPackage.musicalKey}</p>
                </div>

                <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-700">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Genre Fusion</span>
                  <p className="text-sm font-bold text-white mt-2">{result.musicProductionPackage.genreFusion}</p>
                </div>
              </div>

              {/* Instrumentation */}
              <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">Recommended Primary Instrumentation</h5>
                <div className="flex flex-wrap gap-2">
                  {result.musicProductionPackage.primaryInstrumentation.map((inst, i) => (
                    <span key={i} className="px-3 py-1 bg-teal-950/80 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold">
                      🎸 {inst}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vocal Arrangement & Production Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-2">
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">Vocal Arrangement</h5>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.musicProductionPackage.vocalArrangement}</p>
                </div>

                <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-2">
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">Pro Mix & Drop Tips</h5>
                  <ul className="list-disc pl-4 text-xs text-gray-300 space-y-1">
                    {result.musicProductionPackage.productionTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Reference Tracks */}
              {result.musicProductionPackage.referenceTracks.length > 0 && (
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-3">
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">Trending Reference Hits</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.musicProductionPackage.referenceTracks.map((ref, i) => (
                      <div key={i} className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700 text-xs">
                        <strong className="text-teal-300 block font-bold">{ref.title}</strong>
                        <span className="text-gray-400 block mb-1">by {ref.artist}</span>
                        <p className="text-gray-300 italic text-[11px]">{ref.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRITIC EVALUATION MATRIX */}
          {activeResultTab === 'critics' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Virality Critic */}
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-teal-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Virality Critic</span>
                    <span className="text-xs font-black text-teal-400">{result.criticEvaluation.viralityCritic.score}%</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.criticEvaluation.viralityCritic.critique}</p>
                </div>

                {/* Literary Critic */}
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-teal-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Literary Critic</span>
                    <span className="text-xs font-black text-teal-400">{result.criticEvaluation.literaryCritic.score}%</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.criticEvaluation.literaryCritic.critique}</p>
                </div>

                {/* Flow Critic */}
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-teal-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Flow & Scansion Critic</span>
                    <span className="text-xs font-black text-teal-400">{result.criticEvaluation.flowCritic.score}%</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.criticEvaluation.flowCritic.critique}</p>
                </div>

                {/* Occasion Fit Critic */}
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-teal-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Occasion Fit Critic</span>
                    <span className="text-xs font-black text-teal-400">{result.criticEvaluation.occasionFitCritic.score}%</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.criticEvaluation.occasionFitCritic.critique}</p>
                </div>
              </div>

              {/* Actionable Suggestions */}
              {result.criticEvaluation.actionableSuggestions.length > 0 && (
                <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-2">
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">Applied Refinements</h5>
                  <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1">
                    {result.criticEvaluation.actionableSuggestions.map((sugg, i) => (
                      <li key={i}>{sugg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VIRALITY CHECKLIST AUDIT */}
          {activeResultTab === 'checklist' && (
            <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-700/80 space-y-4 animate-fade-in">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">7-Point Virality Checklist Audit</h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-gray-700">
                  <span className="text-gray-200">1. Chorus Hook is 7 words or less?</span>
                  <span className={`px-2.5 py-0.5 rounded font-bold ${result.viralityChecklist.hookSevenWordsOrLess ? "bg-green-950 text-green-300 border border-green-500/40" : "bg-red-950 text-red-300"}`}>
                    {result.viralityChecklist.hookSevenWordsOrLess ? "PASSED" : "FAILED"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-gray-700">
                  <span className="text-gray-200">2. Repeatable rhythmic motif in hook?</span>
                  <span className={`px-2.5 py-0.5 rounded font-bold ${result.viralityChecklist.repeatableRhythmicMotif ? "bg-green-950 text-green-300 border border-green-500/40" : "bg-red-950 text-red-300"}`}>
                    {result.viralityChecklist.repeatableRhythmicMotif ? "PASSED" : "FAILED"}
                  </span>
                </div>

                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 space-y-1">
                  <span className="text-gray-200 font-semibold block">3. Instagram/TikTok Quotable Lines:</span>
                  <ul className="list-disc pl-5 text-teal-300 italic text-[11px] space-y-0.5">
                    {result.viralityChecklist.instagramQuotableLines.map((line, i) => (
                      <li key={i}>"{line}"</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 space-y-1">
                  <span className="text-gray-200 font-semibold block">4. Opening 3-Second Attention Grabber:</span>
                  <p className="text-teal-300 italic text-[11px]">"{result.viralityChecklist.firstThreeSecondAttentionGrabber}"</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-gray-700">
                  <span className="text-gray-200">5. Universal emotional arc across cultures?</span>
                  <span className={`px-2.5 py-0.5 rounded font-bold ${result.viralityChecklist.universalEmotionalArc ? "bg-green-950 text-green-300 border border-green-500/40" : "bg-red-950 text-red-300"}`}>
                    {result.viralityChecklist.universalEmotionalArc ? "PASSED" : "FAILED"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-gray-700">
                  <span className="text-gray-200">6. Trending instrumentation match?</span>
                  <span className={`px-2.5 py-0.5 rounded font-bold ${result.viralityChecklist.trendingInstrumentationMatch ? "bg-green-950 text-green-300 border border-green-500/40" : "bg-red-950 text-red-300"}`}>
                    {result.viralityChecklist.trendingInstrumentationMatch ? "PASSED" : "FAILED"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AGENT DECISION LOGS */}
          {activeResultTab === 'logs' && (
            <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-700 space-y-3 font-mono text-xs text-gray-300 max-h-96 overflow-y-auto animate-fade-in">
              <h4 className="font-bold text-teal-300 uppercase tracking-wider font-sans">Execution Trace Log</h4>
              {result.executionLog.map((log, idx) => (
                <div key={idx} className="p-2 bg-black/50 rounded border border-gray-800 flex items-start gap-2">
                  <span className="text-gray-500 text-[10px]">{log.timestamp}</span>
                  <span className="text-teal-400 font-bold">[{log.step}]:</span>
                  <span className="text-gray-200">{log.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: ACTIVITY LOG & HISTORICAL SESSIONS */}
          {activeResultTab === 'activityLog' && (
            <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-700 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="text-teal-400">📜</span> Dedicated Orchestrator Activity Log
                  </h4>
                  <p className="text-xs text-gray-400">Historical trace of past TaskOrchestrator runs, virality scores, and milestone evolution.</p>
                </div>
                <button
                  onClick={async () => {
                    const logs = await kbDB.getActivityLogs();
                    setSavedActivityLogs(logs);
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-teal-300 text-xs font-bold rounded-lg border border-gray-700 transition-all cursor-pointer"
                >
                  🔄 Refresh Logs
                </button>
              </div>

              {savedActivityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs space-y-2">
                  <p className="text-sm font-semibold">No historical activity logs recorded yet.</p>
                  <p>Run the Autonomous Agentic Orchestrator loop above to generate persistent activity session logs.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {savedActivityLogs.map((logItem, idx) => (
                    <div key={logItem.id || idx} className="bg-gray-800/90 p-4 rounded-xl border border-gray-700/80 space-y-2.5 hover:border-teal-500/40 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">
                            {new Date(logItem.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="px-2 py-0.5 bg-teal-950 text-teal-300 border border-teal-500/30 text-[10px] font-bold rounded">
                            {logItem.occasion || "General Milestone"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300">Virality Index:</span>
                          <span className="text-sm font-black text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/30">
                            {logItem.viralityScore}%
                          </span>
                          {logItem.result && (
                            <button
                              onClick={() => {
                                setResult(logItem.result);
                                setActiveResultTab('lyrics');
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold rounded transition-all cursor-pointer"
                            >
                              Inspect Song ➔
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white text-sm">🎵 {logItem.title}</span>
                        <span className="text-gray-400 text-[11px]">Genre: {logItem.genre}</span>
                      </div>

                      {logItem.result?.executionLog && logItem.result.executionLog.length > 0 && (
                        <details className="text-[11px] font-mono text-gray-400 bg-black/40 p-2.5 rounded-lg border border-gray-800">
                          <summary className="cursor-pointer font-sans font-semibold text-teal-400 hover:text-teal-300 select-none">
                            View 6-Stage Execution Trace ({logItem.result.executionLog.length} steps)
                          </summary>
                          <div className="mt-2 space-y-1 pt-2 border-t border-gray-800">
                            {logItem.result.executionLog.map((stepLog: any, sIdx: number) => (
                              <div key={sIdx} className="flex items-start gap-1.5">
                                <span className="text-gray-500">{stepLog.timestamp}</span>
                                <span className="text-teal-300 font-bold">[{stepLog.step}]:</span>
                                <span className="text-gray-300">{stepLog.detail}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERACTIVE CONVERSATIONAL AGENT CO-PILOT CHAT PANEL */}
          <div className="mt-8 pt-6 border-t border-gray-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-teal-400">💬</span> Agent Co-Pilot Refinement Chat
                </h4>
                <p className="text-xs text-gray-400">
                  Chat with the Orchestrator to tweak lyrics, rhythm, tempo, or instrumentation in real time.
                </p>
              </div>

              {chatHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatHistory([])}
                  className="text-xs text-gray-400 hover:text-red-400 underline transition-all self-start sm:self-auto cursor-pointer"
                >
                  Clear Chat History
                </button>
              )}
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-gray-400 font-semibold flex items-center mr-1">Quick Tweaks:</span>
              <button
                type="button"
                onClick={() => handleRefineWithAgent("Make the Chorus hook punchier for TikTok with a 15-second viral catchphrase")}
                disabled={isRefining}
                className="px-2.5 py-1 bg-gray-900 hover:bg-teal-950 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                ⚡ Punchier TikTok Chorus
              </button>
              <button
                type="button"
                onClick={() => handleRefineWithAgent("Speed up tempo to 128 BPM with an energetic Synthwave bassline")}
                disabled={isRefining}
                className="px-2.5 py-1 bg-gray-900 hover:bg-teal-950 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                🎸 128 BPM Synthwave Vibe
              </button>
              <button
                type="button"
                onClick={() => handleRefineWithAgent("Add a dramatic spoken-word or whisper intro before Verse 1")}
                disabled={isRefining}
                className="px-2.5 py-1 bg-gray-900 hover:bg-teal-950 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                🎤 Dramatic Spoken Intro
              </button>
              <button
                type="button"
                onClick={() => handleRefineWithAgent("Deepen the emotional imagery and internal rhyme in the Bridge section")}
                disabled={isRefining}
                className="px-2.5 py-1 bg-gray-900 hover:bg-teal-950 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                💖 Deeper Bridge Imagery
              </button>
            </div>

            {/* Conversation Log Box */}
            {chatHistory.length > 0 && (
              <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-700/80 max-h-60 overflow-y-auto space-y-3">
                {chatHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      item.sender === 'user'
                        ? "bg-teal-950/60 border border-teal-500/30 ml-8 text-teal-100"
                        : "bg-gray-800 border border-gray-700 mr-8 text-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-75">
                      <span>{item.sender === 'user' ? '👤 You' : '🤖 Virality Agent Co-Pilot'}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{item.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRefineWithAgent();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Ask the Agent to adjust lyrics, change BPM, swap rhyming words, or tweak mood..."
                disabled={isRefining}
                className="flex-1 bg-gray-900 text-gray-100 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 text-xs font-medium placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!chatPrompt.trim() || isRefining}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isRefining ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Refining...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Refine Song</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Lyrics Companion Agent Dock Widget */}
      <LyricsCompanionAgent result={result} onRefine={handleRefineWithAgent} />

      {/* Compare Drafts Side-by-Side Modal */}
      {isCompareModalOpen && result?.draftTracks && (
        <React.Suspense fallback={null}>
          <CompareDraftsModal
            drafts={result.draftTracks}
            onClose={() => setIsCompareModalOpen(false)}
          onSetMaster={(selectedMasterTrack) => {
            setResult({
              ...result,
              songTitle: selectedMasterTrack.title,
              lyrics: selectedMasterTrack.lyrics
            });
            alert(`Set "${selectedMasterTrack.title}" as your primary master song version!`);
          }}
          />
        </React.Suspense>
      )}
    </div>
  );
};
export default AutonomousViralityAgentStudio;
