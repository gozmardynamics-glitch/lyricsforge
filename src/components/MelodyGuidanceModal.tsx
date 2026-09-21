import React, { useState, useEffect, useRef, useCallback } from "react";
import { getActiveModelId } from "../agents/llmRegistry";
import { Type } from "@google/genai";
import { ai } from "../aiShim";
import { Song, Album, LyricDraftVersion, LanguageOption, LANGUAGES, StylePreset, DraftTrack, RecentTheme, ViralityChecklist, CriticEvaluation, MusicProductionPackage, AgenticLyricResult, LS_RECENT_THEMES, LS_THEME_STATE, LS_ALBUM_STATE, LS_STYLE_PRESETS, LS_APP_STATE, LS_AGENT_STATE } from "../types";
import { OCCASIONS_CATEGORIZED, OCCASIONS, GENRES, RHYME_SCHEMES, EMOTIONAL_MOODS, DEFAULT_STYLE_PRESETS } from "../constants";
import { Tooltip, TooltipInfo, CopyButton, Spinner, CheckmarkIcon, parseLyricsMarkdown, countSyllablesInWord, countSyllablesInLine } from "./shared";

// --- GENRE MELODY & SCALE MOTIF GUIDANCE STUDIO (VISUAL & AUDIO) ---
// =========================================================================

export type ScaleFormulaType = 
  | 'major' 
  | 'minor' 
  | 'major_pentatonic' 
  | 'minor_pentatonic' 
  | 'dorian' 
  | 'mixolydian' 
  | 'phrygian' 
  | 'harmonic_minor' 
  | 'blues' 
  | 'lydian';

export interface ScaleDefinition {
  id: ScaleFormulaType;
  name: string;
  formula: number[]; // semitone intervals from root
  degreeNames: string[];
  vibe: string;
  bestFor: string;
  avoidNotes: string;
}

export const SCALE_DEFINITIONS: Record<ScaleFormulaType, ScaleDefinition> = {
  major_pentatonic: {
    id: 'major_pentatonic',
    name: 'Major Pentatonic (1 - 2 - 3 - 5 - 6)',
    formula: [0, 2, 4, 7, 9],
    degreeNames: ['1 (Root)', '2 (Step)', '3 (Major 3rd)', '5 (Fifth)', '6 (Sweet 6th)'],
    vibe: 'Uplifting, universally memorable, zero clashing dissonances, pure pop earworm',
    bestFor: 'Pop choruses, Country storytelling, uplifting Afrobeats, anthemic R&B hooks',
    avoidNotes: 'Avoid adding 4th and 7th on strong downbeats if you want a clean, floating sound'
  },
  minor_pentatonic: {
    id: 'minor_pentatonic',
    name: 'Minor Pentatonic (1 - b3 - 4 - 5 - b7)',
    formula: [0, 3, 5, 7, 10],
    degreeNames: ['1 (Root)', 'b3 (Minor 3rd)', '4 (Suspended)', '5 (Fifth)', 'b7 (Bluesy 7th)'],
    vibe: 'Gritty, rhythmic, swaggering, soulful and emotionally raw',
    bestFor: 'Hip Hop / Trap flows, Rock riffs, Blues vocal runs, dark R&B hooks',
    avoidNotes: 'Avoid over-resting on the 4th degree without resolving down to the minor 3rd or Root'
  },
  major: {
    id: 'major',
    name: 'Natural Major / Ionian (1 - 2 - 3 - 4 - 5 - 6 - 7)',
    formula: [0, 2, 4, 5, 7, 9, 11],
    degreeNames: ['1 (Root)', '2 (Step)', '3 (Major 3rd)', '4 (Tension)', '5 (Fifth)', '6 (Sixth)', '7 (Leading Tone)'],
    vibe: 'Triumphant, emotional, cinematic, bright and resolute',
    bestFor: 'Stadium anthems, Disney / Broadway ballads, K-Pop chorus surges, Indie Folk',
    avoidNotes: 'The 4th degree creates tension over major chords—use it as a quick passing note'
  },
  minor: {
    id: 'minor',
    name: 'Natural Minor / Aeolian (1 - 2 - b3 - 4 - 5 - b6 - b7)',
    formula: [0, 2, 3, 5, 7, 8, 10],
    degreeNames: ['1 (Root)', '2 (Step)', 'b3 (Minor 3rd)', '4 (Fourth)', '5 (Fifth)', 'b6 (Heartbreak 6th)', 'b7 (Subtonic)'],
    vibe: 'Melancholic, brooding, nocturnal, modern and atmospheric',
    bestFor: 'EDM builds, Dark Pop, Synthwave, cinematic heartbreak ballads, moody Trap',
    avoidNotes: 'The b6 note carries heavy heartbreak tension; resolve down to the 5th for deep emotional relief'
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian Mode (1 - 2 - b3 - 4 - 5 - 6 - b7)',
    formula: [0, 2, 3, 5, 7, 9, 10],
    degreeNames: ['1 (Root)', '2 (Step)', 'b3 (Minor 3rd)', '4 (Fourth)', '5 (Fifth)', '6 (Natural Major 6th)', 'b7 (Flat 7th)'],
    vibe: 'Smooth, sophisticated, jazzy, soulful, never overly sad or gloomy',
    bestFor: 'Neo-Soul vocal runs, Funk grooves, Indie Rock, modern R&B, UK Garage',
    avoidNotes: 'Highlight the natural 6th degree—it gives Dorian its iconic, luxurious signature sound'
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian Mode (1 - 2 - 3 - 4 - 5 - 6 - b7)',
    formula: [0, 2, 4, 5, 7, 9, 10],
    degreeNames: ['1 (Root)', '2 (Step)', '3 (Major 3rd)', '4 (Fourth)', '5 (Fifth)', '6 (Sixth)', 'b7 (Flat 7th Blues)'],
    vibe: 'Bluesy, carefree, driving, retro rock energy with a hint of rebellious swagger',
    bestFor: 'Classic Rock anthems, Blues-Pop, Afrobeats lilts, Country rock grooves',
    avoidNotes: 'Lean into the b7 note when singing over dominant chords for that iconic 70s rock vocal punch'
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian Mode (1 - b2 - b3 - 4 - 5 - b6 - b7)',
    formula: [0, 1, 3, 5, 7, 8, 10],
    degreeNames: ['1 (Root)', 'b2 (Exotic Half-step)', 'b3 (Minor 3rd)', '4 (Fourth)', '5 (Fifth)', 'b6 (Flat 6th)', 'b7 (Flat 7th)'],
    vibe: 'Dark, tense, cinematic, Spanish/Flamenco mystique, cyberpunk menace',
    bestFor: 'Dark Trap melodies, Cyberpunk/Synthwave, Metalcore screams, Latin Flamenco',
    avoidNotes: 'The b2 is the most dissonant semitone; use it as a sudden dramatic ornament or slide'
  },
  harmonic_minor: {
    id: 'harmonic_minor',
    name: 'Harmonic Minor (1 - 2 - b3 - 4 - 5 - b6 - 7)',
    formula: [0, 2, 3, 5, 7, 8, 11],
    degreeNames: ['1 (Root)', '2 (Step)', 'b3 (Minor 3rd)', '4 (Fourth)', '5 (Fifth)', 'b6 (Flat 6th)', '7 (Natural Leading Tone)'],
    vibe: 'Theatrical, neoclassical, dramatic tension with an augmented 2nd jump',
    bestFor: 'Gothic Pop, Tango & Latin drama, Progressive Metal, Baroque Pop',
    avoidNotes: 'The 1.5-step jump between b6 and natural 7 is wide—practice hitting it accurately'
  },
  blues: {
    id: 'blues',
    name: 'Blues Scale (1 - b3 - 4 - b5 - 5 - b7)',
    formula: [0, 3, 5, 6, 7, 10],
    degreeNames: ['1 (Root)', 'b3 (Minor 3rd)', '4 (Fourth)', 'b5 (Blue Note / Tritone)', '5 (Fifth)', 'b7 (Flat 7th)'],
    vibe: 'Raw emotional grit, vocal bends, weeping soul, timeless attitude',
    bestFor: 'Blues, Soul ad-libs, Rock & Roll hooks, gritty Alt-Pop vocal flourishes',
    avoidNotes: 'Slur or bend through the b5 directly into the natural 5 for maximum vocal impact'
  },
  lydian: {
    id: 'lydian',
    name: 'Lydian Mode (1 - 2 - 3 - #4 - 5 - 6 - 7)',
    formula: [0, 2, 4, 6, 7, 9, 11],
    degreeNames: ['1 (Root)', '2 (Step)', '3 (Major 3rd)', '#4 (Ethereal Sharp 4th)', '5 (Fifth)', '6 (Sixth)', '7 (Leading Tone)'],
    vibe: 'Ethereal, dreamy, futuristic, floating, wonder-filled',
    bestFor: 'Dream Pop, K-Pop pre-choruses, Sci-Fi synth ballads, Shoegaze',
    avoidNotes: 'Sustain the #4 note over major chords to induce a magical feeling of levitation'
  }
};

export interface MelodicMotifItem {
  id: string;
  name: string;
  role: 'Chorus Earworm' | 'Pre-Chorus Lift' | 'Verse Story' | 'Drop / Climax' | 'Vocal Melisma';
  contourShape: 'Arch' | 'Waterfall' | 'Staircase' | 'Wave' | 'Call-Response';
  scaleType: ScaleFormulaType;
  semitoneSteps: number[]; // Relative to root semitones
  degreeLabels: string[];
  rhythmDurations: number[]; // Beats (e.g. 1 = quarter, 0.5 = eighth, 1.5 = dotted quarter)
  syllableGuidance: string[];
  exampleLyrics: string;
  vocalTechniqueTip: string;
  whyItFitsGenre: string;
}

export interface GenreMelodyGuideData {
  genre: string;
  primaryScale: ScaleFormulaType;
  secondaryScale: ScaleFormulaType;
  pitchCenterGuidance: string;
  leapVsStepGuidance: string;
  vowelPlacementTip: string;
  genreTrapsToAvoid: string;
  motifs: MelodicMotifItem[];
}

export const GENRE_MELODY_PROFILES: Record<string, GenreMelodyGuideData> = {
  Pop: {
    genre: "Pop",
    primaryScale: "major_pentatonic",
    secondaryScale: "major",
    pitchCenterGuidance: "Keep verses in lower speaking range (C4–E4), leaping up to 5th or Octave (G4–C5) for the chorus explosion.",
    leapVsStepGuidance: "Use stepwise motion for fast conversational verses, then introduce a single dramatic leap of a 4th or 5th at the start of the chorus.",
    vowelPlacementTip: "Place open vowels ('Ah', 'Oh', 'Eye') on highest notes and downbeats for effortless belting and vocal projection.",
    genreTrapsToAvoid: "Don't over-complicate melodic runs. 3-note repetition with rhythmic syncopation creates instant listener retention.",
    motifs: [
      {
        id: "pop-1",
        name: "The 3-Note Earworm Hook",
        role: "Chorus Earworm",
        contourShape: "Wave",
        scaleType: "major_pentatonic",
        semitoneSteps: [7, 7, 7, 4, 0, 4, 7],
        degreeLabels: ["5", "5", "5", "3", "1", "3", "5"],
        rhythmDurations: [0.5, 0.5, 1, 0.5, 1, 0.5, 1.5],
        syllableGuidance: ["Staccato", "Staccato", "Hold", "Drop", "Root Land", "Rise", "Sustain"],
        exampleLyrics: "Tell me that you want me now",
        vocalTechniqueTip: "Crisp consonants on the 5th degree repetitions with a sweet vibrato release on the final note.",
        whyItFitsGenre: "The rhythmic repetition on the 5th degree locks into short-term memory within 3 seconds."
      },
      {
        id: "pop-2",
        name: "The Soaring Octave Leap Hook",
        role: "Drop / Climax",
        contourShape: "Arch",
        scaleType: "major_pentatonic",
        semitoneSteps: [0, 4, 7, 12, 9, 7, 4, 0],
        degreeLabels: ["1", "3", "5", "8 (High Root)", "6", "5", "3", "1"],
        rhythmDurations: [0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 1.5],
        syllableGuidance: ["Soft", "Climb", "Prep", "FULL POWER", "Cascade", "Step", "Step", "Home"],
        exampleLyrics: "We are light in the dark tonight",
        vocalTechniqueTip: "Chest-dominant mix on the high root octave; avoid flipping into weak falsetto unless intentional.",
        whyItFitsGenre: "The octave leap triggers dopamine release and emotional catharsis in stadium-sized pop choruses."
      },
      {
        id: "pop-3",
        name: "The Stepwise Pre-Chorus Staircase",
        role: "Pre-Chorus Lift",
        contourShape: "Staircase",
        scaleType: "major",
        semitoneSteps: [2, 4, 5, 7, 9, 11, 12],
        degreeLabels: ["2", "3", "4", "5", "6", "7", "8"],
        rhythmDurations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
        syllableGuidance: ["Step", "Step", "Tension", "Rise", "Lift", "Peak", "Release"],
        exampleLyrics: "Count the seconds till the fever breaks",
        vocalTechniqueTip: "Crescendo dynamics gradually from piano to forte as each pitch ascends the scale.",
        whyItFitsGenre: "Ascending stepwise tension pulls the listener inexorably into the explosive chorus payoff."
      },
      {
        id: "pop-4",
        name: "The Cascading Melodic Waterfall",
        role: "Verse Story",
        contourShape: "Waterfall",
        scaleType: "major_pentatonic",
        semitoneSteps: [9, 7, 4, 2, 0],
        degreeLabels: ["6", "5", "3", "2", "1"],
        rhythmDurations: [1, 0.5, 0.5, 0.5, 1.5],
        syllableGuidance: ["High Entry", "Cascade", "Warm", "Step", "Anchor"],
        exampleLyrics: "Walking home alone again",
        vocalTechniqueTip: "Gentle breathy tone on the high 6th, settling into grounded chest warmth on the root.",
        whyItFitsGenre: "Downward cascading motifs convey intimacy, narrative reflection, and melancholic beauty."
      }
    ]
  },
  "Hip Hop": {
    genre: "Hip Hop",
    primaryScale: "minor_pentatonic",
    secondaryScale: "phrygian",
    pitchCenterGuidance: "Anchor firmly on the Root and minor 3rd. Melodic hip hop relies on microtonal sliding and rhythmic syncopation.",
    leapVsStepGuidance: "Keep pitch leaps tight (minor 3rd or 4th). The energy is created through rapid 16th/triplet cadence rather than wide vocal range.",
    vowelPlacementTip: "Use crisp percussive plosives ('K', 'T', 'P', 'B') on syncopated upbeats to lock in with the 808 snare.",
    genreTrapsToAvoid: "Don't drift too far into bright major intervals; retain the minor 3rd and flat 7th to preserve street grit.",
    motifs: [
      {
        id: "hiphop-1",
        name: "The Minor 3rd Triplet Bounce",
        role: "Chorus Earworm",
        contourShape: "Wave",
        scaleType: "minor_pentatonic",
        semitoneSteps: [3, 0, 3, 0, 5, 3, 0],
        degreeLabels: ["b3", "1", "b3", "1", "4", "b3", "1"],
        rhythmDurations: [0.33, 0.33, 0.34, 0.33, 0.33, 0.34, 1],
        syllableGuidance: ["Bounce", "Drop", "Bounce", "Drop", "Punch", "Slide", "Rest"],
        exampleLyrics: "Never looking back at what they said",
        vocalTechniqueTip: "Heavy autotune / microtonal vocal slide between the b3 and root.",
        whyItFitsGenre: "The minor-third bounce creates a hypnotic rhythmic lock with modern trap hi-hat rolls."
      },
      {
        id: "hiphop-2",
        name: "The Monotone Staccato with Final Drop",
        role: "Verse Story",
        contourShape: "Staircase",
        scaleType: "minor_pentatonic",
        semitoneSteps: [0, 0, 0, 0, 0, 10, 0],
        degreeLabels: ["1", "1", "1", "1", "1", "b7", "1"],
        rhythmDurations: [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1],
        syllableGuidance: ["Punch", "Punch", "Punch", "Punch", "Flow", "Dip", "Resolve"],
        exampleLyrics: "Stacking up the paper on the floor",
        vocalTechniqueTip: "Strict rhythmic scansion right in the pocket; punchy dry articulation.",
        whyItFitsGenre: "Monotone repetition builds lyrical tension before a satisfying rhyming punchline drop."
      },
      {
        id: "hiphop-3",
        name: "The Dark Phrygian Half-Step Slide",
        role: "Drop / Climax",
        contourShape: "Wave",
        scaleType: "phrygian",
        semitoneSteps: [0, 1, 0, 1, 3, 1, 0],
        degreeLabels: ["1", "b2", "1", "b2", "b3", "b2", "1"],
        rhythmDurations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
        syllableGuidance: ["Root", "Ominous", "Root", "Ominous", "Peak", "Slip", "Home"],
        exampleLyrics: "Shadows creeping through the city lights",
        vocalTechniqueTip: "Dark resonant throat tone with an aggressive rasp on the b2 half-step.",
        whyItFitsGenre: "The b2 semitone friction embodies cinematic menace and dark trap moodiness."
      }
    ]
  },
  "R&B": {
    genre: "R&B",
    primaryScale: "dorian",
    secondaryScale: "minor_pentatonic",
    pitchCenterGuidance: "Comfortable middle range with soaring falsetto and melismatic runs between the 5th and 9th degrees.",
    leapVsStepGuidance: "Fluid pentatonic cascades with grace notes sliding into the major 6th and minor 3rd.",
    vowelPlacementTip: "Smooth diphthongs ('Oo-ee', 'Ah-ee') that allow extended vocal runs without breaking tone.",
    genreTrapsToAvoid: "Don't sing rigid quantized notes; embrace micro-timing, vocal bends, and soulful vibrato tail-offs.",
    motifs: [
      {
        id: "rnb-1",
        name: "The Neo-Soul Pentatonic Melisma Run",
        role: "Vocal Melisma",
        contourShape: "Waterfall",
        scaleType: "dorian",
        semitoneSteps: [7, 5, 3, 2, 0, 10, 0],
        degreeLabels: ["5", "4", "b3", "2", "1", "b7", "1"],
        rhythmDurations: [0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 1],
        syllableGuidance: ["Hold", "Run", "Run", "Run", "Slide", "Dip", "Resolve"],
        exampleLyrics: "Touch my soul until the morning comes",
        vocalTechniqueTip: "Silky fast vocal agility; keep jaw relaxed and articulate through head voice resonance.",
        whyItFitsGenre: "The classic 5-4-b3-2-1 run is the quintessential soulful hallmark of modern R&B."
      },
      {
        id: "rnb-2",
        name: "The Sensual 9th Suspension Hook",
        role: "Chorus Earworm",
        contourShape: "Arch",
        scaleType: "dorian",
        semitoneSteps: [2, 3, 7, 9, 7, 3, 0],
        degreeLabels: ["2 (9th)", "b3", "5", "6 (Dorian)", "5", "b3", "1"],
        rhythmDurations: [0.5, 0.5, 1, 1, 0.5, 0.5, 1],
        syllableGuidance: ["Intimate", "Warm", "Lift", "Luxurious", "Echo", "Warm", "Home"],
        exampleLyrics: "Baby stay with me another night",
        vocalTechniqueTip: "Sultry breathy tone, leaning into the Dorian 6th note for a warm golden atmosphere.",
        whyItFitsGenre: "The natural 6th and 9th intervals create that lush, non-depressive romantic melancholy."
      }
    ]
  },
  Rock: {
    genre: "Rock",
    primaryScale: "mixolydian",
    secondaryScale: "blues",
    pitchCenterGuidance: "High chest power belt (E4–A4) pushing the upper limits of the vocal register for emotional urgency.",
    leapVsStepGuidance: "Punchy leaps between the root, flat-7, and 5th with aggressive blues note bends.",
    vowelPlacementTip: "Wide open vowels ('Yeah', 'All', 'No') anchored by gritty distortion and vocal fry.",
    genreTrapsToAvoid: "Don't sing with polite, pristine vibrato. Raw power and intentional pitch friction drive rock melodies.",
    motifs: [
      {
        id: "rock-1",
        name: "The Power Pentatonic Anthem Punch",
        role: "Chorus Earworm",
        contourShape: "Wave",
        scaleType: "blues",
        semitoneSteps: [0, 3, 5, 6, 7, 10, 12],
        degreeLabels: ["1", "b3", "4", "b5 (Blue)", "5", "b7", "8"],
        rhythmDurations: [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5],
        syllableGuidance: ["Grit", "Climb", "Push", "BEND", "Power", "Shout", "HOLD"],
        exampleLyrics: "Break the chains and tear the walls down",
        vocalTechniqueTip: "Edge-resonant chest compression with safe vocal fry on the blue note bend.",
        whyItFitsGenre: "The blues note friction combined with an octave shout gives high-octane rock anthems their bite."
      },
      {
        id: "rock-2",
        name: "The Mixolydian Flat-7 Drive",
        role: "Drop / Climax",
        contourShape: "Arch",
        scaleType: "mixolydian",
        semitoneSteps: [0, 4, 7, 10, 7, 4, 0],
        degreeLabels: ["1", "3", "5", "b7", "5", "3", "1"],
        rhythmDurations: [0.5, 0.5, 1, 1, 0.5, 0.5, 1],
        syllableGuidance: ["Kick", "Rise", "Blast", "REBEL", "Drive", "Step", "Home"],
        exampleLyrics: "Living on the edge of the highway",
        vocalTechniqueTip: "Bright forward twang on the flat-7 for maximum cut through heavy distorted guitars.",
        whyItFitsGenre: "The flat-7 interval over a major triad is the harmonic DNA of classic stadium rock."
      }
    ]
  },
  Country: {
    genre: "Country",
    primaryScale: "major_pentatonic",
    secondaryScale: "mixolydian",
    pitchCenterGuidance: "Conversational middle register featuring sweet vocal lilts, yodel-style breaks, and warm twang.",
    leapVsStepGuidance: "Sweet 3rd-to-2nd stepwise falls with expressive hammer-on grace notes between minor and major 3rd.",
    vowelPlacementTip: "Southern twang vowels ('ah-ee', 'ay-uh') that sit comfortably in forward pharyngeal resonance.",
    genreTrapsToAvoid: "Don't sound too theatrical. Country melody thrives on conversational authenticity and story clarity.",
    motifs: [
      {
        id: "country-1",
        name: "The Sweet 3rd-to-2nd Country Lilt",
        role: "Verse Story",
        contourShape: "Waterfall",
        scaleType: "major_pentatonic",
        semitoneSteps: [9, 0, 2, 4, 2, 0],
        degreeLabels: ["6 (Low)", "1", "2", "3", "2", "1"],
        rhythmDurations: [0.5, 0.5, 0.5, 1, 0.5, 1.5],
        syllableGuidance: ["Warm", "Step", "Climb", "Sweet Lilt", "Fall", "Home"],
        exampleLyrics: "Dirt road memories under the pines",
        vocalTechniqueTip: "Subtle acoustic twang on the 3rd, sliding smoothly through the 2nd into the root.",
        whyItFitsGenre: "The 3-2-1 lilt creates immediate warmth, nostalgia, and authentic Americana storytelling."
      },
      {
        id: "country-2",
        name: "The Bluegrass Hammer-On Chorus Hook",
        role: "Chorus Earworm",
        contourShape: "Arch",
        scaleType: "major_pentatonic",
        semitoneSteps: [3, 4, 7, 9, 7, 4, 0],
        degreeLabels: ["b3 (Grace)", "3", "5", "6", "5", "3", "1"],
        rhythmDurations: [0.25, 0.75, 1, 1, 0.5, 0.5, 1],
        syllableGuidance: ["Slur", "Hit", "Belt", "Shine", "Float", "Warm", "Home"],
        exampleLyrics: "Whiskey burns but love stays true",
        vocalTechniqueTip: "Quick bluesy grace note from b3 into major 3rd to simulate a banjo hammer-on.",
        whyItFitsGenre: "The minor-to-major third inflection is the hallmark of heartfelt country anthems."
      }
    ]
  },
  Synthwave: {
    genre: "Synthwave",
    primaryScale: "minor",
    secondaryScale: "phrygian",
    pitchCenterGuidance: "Lush 80s gated reverb range (C4–G4) punctuated by arpeggiated octave climbs and robotic vocoder harmonies.",
    leapVsStepGuidance: "Octave leaps combined with descending stepwise sighs that mirror analog synth filters opening and closing.",
    vowelPlacementTip: "Sustained pure vowels ('Oh', 'Ah', 'Eye') that allow stereo chorus and analog delay to shimmer.",
    genreTrapsToAvoid: "Avoid rapid modern triplet chatter; 80s synth melodies prioritize expansive, cinematic long tones.",
    motifs: [
      {
        id: "synth-1",
        name: "The 80s Arpeggiated Octave Drive",
        role: "Chorus Earworm",
        contourShape: "Staircase",
        scaleType: "minor",
        semitoneSteps: [0, 7, 3, 0, 7, 10, 12],
        degreeLabels: ["1", "5", "b3", "1", "5", "b7", "8"],
        rhythmDurations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5],
        syllableGuidance: ["Low", "High", "Mid", "Low", "High", "Tension", "NEON"],
        exampleLyrics: "Racing into neon midnight dreams",
        vocalTechniqueTip: "Straight, laser-focused pitch with minimal vibrato, letting the chorus effect generate depth.",
        whyItFitsGenre: "The arpeggio outline mirrors classic analog synthesizers like the Roland Juno-106."
      },
      {
        id: "synth-2",
        name: "The Cyberpunk Phrygian Descent",
        role: "Drop / Climax",
        contourShape: "Waterfall",
        scaleType: "phrygian",
        semitoneSteps: [7, 5, 3, 1, 0],
        degreeLabels: ["5", "4", "b3", "b2", "1"],
        rhythmDurations: [1, 0.5, 0.5, 0.5, 1.5],
        syllableGuidance: ["Cry", "Fall", "Cold", "Blade", "Void"],
        exampleLyrics: "Lost inside the hologram",
        vocalTechniqueTip: "Cool, melancholic delivery; lean heavily into the eerie half-step b2 before root.",
        whyItFitsGenre: "Evokes the dark, dystopian Blade Runner atmosphere central to retrowave and cyberpunk."
      }
    ]
  },
  Afrobeats: {
    genre: "Afrobeats",
    primaryScale: "major_pentatonic",
    secondaryScale: "mixolydian",
    pitchCenterGuidance: "Syncopated buoyant mid-range with infectious chant-style call-and-response phrases.",
    leapVsStepGuidance: "Bouncy 3rds and 5ths landing deliberately on the offbeats (the 'and' of 2 and 4).",
    vowelPlacementTip: "Rhythmic percussive syllables ('Eh-eh', 'Oh-na', 'Ye-ye') creating groove in tandem with percussion.",
    genreTrapsToAvoid: "Don't rush the downbeats. The magic of Afrobeats melody lies in relaxed behind-the-beat phrasing.",
    motifs: [
      {
        id: "afro-1",
        name: "The 3-3-2 Syncopated Call",
        role: "Chorus Earworm",
        contourShape: "Wave",
        scaleType: "major_pentatonic",
        semitoneSteps: [0, 4, 7, 4, 0, 2, 0],
        degreeLabels: ["1", "3", "5", "3", "1", "2", "1"],
        rhythmDurations: [0.75, 0.75, 0.5, 0.75, 0.75, 0.5, 1],
        syllableGuidance: ["Groove", "Lift", "Bounce", "Dip", "Anchor", "Lilt", "Settle"],
        exampleLyrics: "Dance with me until the sun go down",
        vocalTechniqueTip: "Effortless, smile-in-the-voice tone with tight rhythmic bounce.",
        whyItFitsGenre: "The 3-3-2 cross-rhythm locks directly into the African clave pattern."
      }
    ]
  },
  EDM: {
    genre: "EDM",
    primaryScale: "minor",
    secondaryScale: "major",
    pitchCenterGuidance: "Low mysterious verse building into an octave-spanning pre-chorus and massive unison top-line drop.",
    leapVsStepGuidance: "Rapid stepwise climb accelerating in note frequency before the bass drop release.",
    vowelPlacementTip: "Giant open sustained vowels ('Free', 'Tonight', 'Alive') engineered to cut through 100dB club synths.",
    genreTrapsToAvoid: "Don't clutter the drop with too many words; let a singular 3-note melodic motif carry the energy.",
    motifs: [
      {
        id: "edm-1",
        name: "The Mainstage Festival Build",
        role: "Pre-Chorus Lift",
        contourShape: "Staircase",
        scaleType: "minor",
        semitoneSteps: [0, 2, 3, 5, 7, 8, 10, 12],
        degreeLabels: ["1", "2", "b3", "4", "5", "b6", "b7", "8"],
        rhythmDurations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
        syllableGuidance: ["Build", "Build", "Rise", "Rise", "High", "Tension", "Ready", "DROP"],
        exampleLyrics: "Feel the current running through my veins",
        vocalTechniqueTip: "High-octane chest belt with wide vibrato on the peak note.",
        whyItFitsGenre: "The straight 8-step climb creates unbearable tension that makes the bass drop release ecstatic."
      }
    ]
  },
  "Indie Folk": {
    genre: "Indie Folk",
    primaryScale: "mixolydian",
    secondaryScale: "dorian",
    pitchCenterGuidance: "Intimate acoustic storytelling range (A3–E4) with harmonized 3rds and choral group singalongs.",
    leapVsStepGuidance: "Gentle 4th-to-3rd suspensions and nostalgic descending sighs.",
    vowelPlacementTip: "Natural speech-level vowels with authentic breath texture and acoustic resonance.",
    genreTrapsToAvoid: "Avoid synthetic autotuned rigidity; raw vocal character and emotional nuances make folk songs timeless.",
    motifs: [
      {
        id: "folk-1",
        name: "The Nostalgic 4th-to-3rd Sigh",
        role: "Verse Story",
        contourShape: "Waterfall",
        scaleType: "mixolydian",
        semitoneSteps: [5, 4, 2, 0],
        degreeLabels: ["4 (Suspension)", "3 (Resolution)", "2 (Step)", "1 (Root)"],
        rhythmDurations: [1, 1, 0.5, 1.5],
        syllableGuidance: ["Long Sigh", "Gentle Resolve", "Soft Step", "Home"],
        exampleLyrics: "Autumn leaves are falling down",
        vocalTechniqueTip: "Airy, vulnerable chest voice with a soft decrescendo into the silence between lines.",
        whyItFitsGenre: "The 4-to-3 harmonic suspension is the universal sound of bittersweet nostalgia."
      }
    ]
  }
};

// Key roots
export const KEY_ROOTS = [
  { note: 'C', semitones: 0, frequency: 261.63 },
  { note: 'C# / Db', semitones: 1, frequency: 277.18 },
  { note: 'D', semitones: 2, frequency: 293.66 },
  { note: 'D# / Eb', semitones: 3, frequency: 311.13 },
  { note: 'E', semitones: 4, frequency: 329.63 },
  { note: 'F', semitones: 5, frequency: 349.23 },
  { note: 'F# / Gb', semitones: 6, frequency: 369.99 },
  { note: 'G', semitones: 7, frequency: 392.00 },
  { note: 'G# / Ab', semitones: 8, frequency: 415.30 },
  { note: 'A', semitones: 9, frequency: 440.00 },
  { note: 'A# / Bb', semitones: 10, frequency: 466.16 },
  { note: 'B', semitones: 11, frequency: 493.88 }
];

export const NOTE_NAMES_CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteNameFromSemitone(rootSemitones: number, intervalSemitones: number, octave: number = 4): string {
  const total = (rootSemitones + intervalSemitones) % 12;
  const octaveShift = Math.floor((rootSemitones + intervalSemitones) / 12);
  return `${NOTE_NAMES_CHROMATIC[total]}${octave + octaveShift}`;
}

export function calculateNoteFrequency(noteName: string): number {
  const match = noteName.match(/^([A-G]#?|[A-G]b?)(\d)$/);
  if (!match) return 440;
  let letter = match[1];
  const octave = parseInt(match[2], 10);
  
  if (letter === 'Db') letter = 'C#';
  if (letter === 'Eb') letter = 'D#';
  if (letter === 'Gb') letter = 'F#';
  if (letter === 'Ab') letter = 'G#';
  if (letter === 'Bb') letter = 'A#';
  
  const semitoneIndex = NOTE_NAMES_CHROMATIC.indexOf(letter);
  if (semitoneIndex === -1) return 440;
  
  // MIDI note: C4 = 60
  const midi = 12 + (octave * 12) + semitoneIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// -------------------------------------------------------------
// Component Props
// -------------------------------------------------------------
export interface MelodyGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGenre?: string;
  initialMood?: string;
  songTitle?: string;
  initialLyrics?: string;
  onApplyMelodyNotes?: (notesSummary: string) => void;
}

export const MelodyGuidanceModal: React.FC<MelodyGuidanceModalProps> = ({
  isOpen,
  onClose,
  initialGenre = "Pop",
  initialMood = "Euphoric",
  songTitle = "Studio Track",
  initialLyrics = "",
  onApplyMelodyNotes
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    return GENRE_MELODY_PROFILES[initialGenre] ? initialGenre : "Pop";
  });
  const [rootKey, setRootKey] = useState<string>("C");
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleFormulaType>("major_pentatonic");
  const [selectedMotif, setSelectedMotif] = useState<MelodicMotifItem | null>(null);
  const [synthSound, setSynthSound] = useState<'triangle' | 'sine' | 'sawtooth' | 'square'>('triangle');
  const [bpm, setBpm] = useState<number>(118);
  const [isPlayingMotif, setIsPlayingMotif] = useState<boolean>(false);
  const [activePlayingNoteIndex, setActivePlayingNoteIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'motifs' | 'visualizer' | 'contour' | 'ai_architect'>('motifs');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // AI Melodic Architect states
  const [lyricLineInput, setLyricLineInput] = useState<string>(() => {
    if (initialLyrics) {
      const firstGoodLine = initialLyrics.split('\n').find(l => l.trim() && !l.startsWith('[') && !l.startsWith('#'));
      return firstGoodLine || "Tell me that you want me now tonight";
    }
    return "Tell me that you want me now tonight";
  });
  const [isGeneratingMelody, setIsGeneratingMelody] = useState<boolean>(false);
  const [aiMelodyResult, setAiMelodyResult] = useState<{
    shapeName: string;
    contourType: string;
    syllableBreakdown: { syllable: string; note: string; degree: string; duration: number; expressionTip: string }[];
    genreRationale: string;
    vocalGuide: string;
  } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  const genreProfile = GENRE_MELODY_PROFILES[selectedGenre] || GENRE_MELODY_PROFILES["Pop"];
  const currentScaleDef = SCALE_DEFINITIONS[selectedScaleType] || SCALE_DEFINITIONS["major_pentatonic"];

  // Update scale & motif when genre changes
  useEffect(() => {
    if (genreProfile) {
      setSelectedScaleType(genreProfile.primaryScale);
      if (genreProfile.motifs && genreProfile.motifs.length > 0) {
        setSelectedMotif(genreProfile.motifs[0]);
      }
    }
  }, [selectedGenre, genreProfile]);

  // Cleanup audio timers on unmount
  useEffect(() => {
    return () => {
      playbackTimeoutRef.current.forEach(t => clearTimeout(t));
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Single pitch synthesizer
  const playTone = useCallback((freq: number, duration: number = 0.5) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = synthSound;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // ADSR envelope
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + (duration * 0.4));
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, [getAudioContext, synthSound]);

  // Stop current motif playback
  const stopMotifPlayback = useCallback(() => {
    playbackTimeoutRef.current.forEach(t => clearTimeout(t));
    playbackTimeoutRef.current = [];
    setIsPlayingMotif(false);
    setActivePlayingNoteIndex(null);
  }, []);

  // Play entire motif sequence with synced visual indicators
  const playMotifSequence = useCallback((motifToPlay: MelodicMotifItem) => {
    stopMotifPlayback();
    setIsPlayingMotif(true);

    const rootData = KEY_ROOTS.find(k => k.note.startsWith(rootKey)) || KEY_ROOTS[0];
    const beatDurationSec = 60 / bpm;
    let accumulatedTimeMs = 0;

    motifToPlay.semitoneSteps.forEach((interval, idx) => {
      const noteDurationBeats = motifToPlay.rhythmDurations[idx] || 0.5;
      const noteDurationSec = noteDurationBeats * beatDurationSec;
      const noteName = getNoteNameFromSemitone(rootData.semitones, interval, 4);
      const freq = calculateNoteFrequency(noteName);

      const timer = setTimeout(() => {
        setActivePlayingNoteIndex(idx);
        playTone(freq, Math.max(0.15, noteDurationSec * 0.9));
      }, accumulatedTimeMs);

      playbackTimeoutRef.current.push(timer);
      accumulatedTimeMs += noteDurationSec * 1000;
    });

    const finishTimer = setTimeout(() => {
      setIsPlayingMotif(false);
      setActivePlayingNoteIndex(null);
    }, accumulatedTimeMs + 200);

    playbackTimeoutRef.current.push(finishTimer);
  }, [bpm, rootKey, playTone, stopMotifPlayback]);

  // Play AI generated melody
  const playAiMelody = useCallback(() => {
    if (!aiMelodyResult) return;
    stopMotifPlayback();
    setIsPlayingMotif(true);

    const beatDurationSec = 60 / bpm;
    let accumulatedTimeMs = 0;

    aiMelodyResult.syllableBreakdown.forEach((item, idx) => {
      const durationSec = (item.duration || 0.5) * beatDurationSec;
      const freq = calculateNoteFrequency(item.note);

      const timer = setTimeout(() => {
        setActivePlayingNoteIndex(idx);
        playTone(freq, Math.max(0.15, durationSec * 0.9));
      }, accumulatedTimeMs);

      playbackTimeoutRef.current.push(timer);
      accumulatedTimeMs += durationSec * 1000;
    });

    const finishTimer = setTimeout(() => {
      setIsPlayingMotif(false);
      setActivePlayingNoteIndex(null);
    }, accumulatedTimeMs + 200);

    playbackTimeoutRef.current.push(finishTimer);
  }, [aiMelodyResult, bpm, playTone, stopMotifPlayback]);

  // Generate AI Melody Contour from lyrics using Gemini
  const handleGenerateAiMelody = async () => {
    if (!lyricLineInput.trim()) return;
    setIsGeneratingMelody(true);
    stopMotifPlayback();

    const rootData = KEY_ROOTS.find(k => k.note.startsWith(rootKey)) || KEY_ROOTS[0];

    const prompt = `You are a master vocal arranger, melody architect, and music theory professor for top Billboard hitmakers.
Generate a bespoke vocal melody pitch contour and scale-motif guide for the given lyric line based strictly on the music genre and scale parameters.

TARGET PARAMETERS:
- Lyric Line: "${lyricLineInput}"
- Genre: ${selectedGenre}
- Emotional Tone: ${initialMood}
- Root Key: ${rootKey}
- Scale Type: ${currentScaleDef.name}
- Scale Degrees available: ${currentScaleDef.degreeNames.join(', ')}

TASK:
Break down the lyric line syllable by syllable, and assign the mathematically and emotionally optimal pitch notes from the ${rootKey} ${currentScaleDef.name} scale.
Ensure high tension notes (7th, 4th, 9th) or peak octaves land on emotionally stressed keywords, and stable anchor notes (Root, 5th, 3rd) land on closure words.

Return ONLY a JSON object with this exact schema:
{
  "shapeName": "e.g. The Soaring Pre-Chorus Arch Hook",
  "contourType": "Arch" | "Waterfall" | "Staircase" | "Wave" | "Call-Response",
  "syllableBreakdown": [
    {
      "syllable": "Word/Syllable fragment",
      "note": "Pitch with octave, e.g. C4, E4, G4, A4, C5",
      "degree": "Scale degree, e.g. Root, Major 3rd, 5th, b7",
      "duration": 0.5, // Beat length: 0.25 (16th), 0.5 (eighth), 1.0 (quarter), 1.5 (dotted quarter)
      "expressionTip": "Vocal styling note, e.g. Breathy attack, Belting chest voice, Grace note slide"
    }
  ],
  "genreRationale": "2 sentences explaining why this melody contour perfectly fits ${selectedGenre}",
  "vocalGuide": "Actionable vocal delivery advice regarding breathing, vowel shaping, and vibrato"
}`;

    try {
      const response = await ai.models.generateContent({
        model: getActiveModelId(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shapeName: { type: Type.STRING },
              contourType: { type: Type.STRING },
              syllableBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    syllable: { type: Type.STRING },
                    note: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    expressionTip: { type: Type.STRING }
                  },
                  required: ["syllable", "note", "degree", "duration", "expressionTip"]
                }
              },
              genreRationale: { type: Type.STRING },
              vocalGuide: { type: Type.STRING }
            },
            required: ["shapeName", "contourType", "syllableBreakdown", "genreRationale", "vocalGuide"]
          }
        }
      });

      const parsed = JSON.parse(response.text);
      if (parsed && Array.isArray(parsed.syllableBreakdown)) {
        setAiMelodyResult(parsed);
      } else {
        throw new Error("Invalid structure");
      }
    } catch (err) {
      console.error("AI Melody generation error:", err);
      // Fallback melody breakdown
      const rootSemitone = rootData.semitones;
      const syllables = lyricLineInput.split(/\s+/).slice(0, 8);
      const fallbackBreakdown = syllables.map((syl, i) => {
        const interval = currentScaleDef.formula[i % currentScaleDef.formula.length];
        const note = getNoteNameFromSemitone(rootSemitone, interval, 4);
        return {
          syllable: syl,
          note: note,
          degree: currentScaleDef.degreeNames[i % currentScaleDef.degreeNames.length],
          duration: i === syllables.length - 1 ? 1.5 : 0.5,
          expressionTip: i === 0 ? "Soft entry" : i === syllables.length - 1 ? "Sustained vibrato" : "Stepwise flow"
        };
      });

      setAiMelodyResult({
        shapeName: `Custom ${selectedGenre} Melodic Arc`,
        contourType: "Arch",
        syllableBreakdown: fallbackBreakdown,
        genreRationale: `Anchors on the ${rootKey} ${currentScaleDef.name} for instant earworm recognition in ${selectedGenre}.`,
        vocalGuide: `Keep open throat resonance on peak syllables and soften vocal pressure on the final resolution note.`
      });
    } finally {
      setIsGeneratingMelody(false);
    }
  };

  const handleCopyNotes = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(label);
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const handleApplyToSong = () => {
    if (!selectedMotif) return;
    const rootData = KEY_ROOTS.find(k => k.note.startsWith(rootKey)) || KEY_ROOTS[0];
    const notesList = selectedMotif.semitoneSteps.map(s => getNoteNameFromSemitone(rootData.semitones, s, 4)).join(' ➔ ');
    const summary = `[Key: ${rootKey} | Scale: ${currentScaleDef.name}]\nMotif: ${selectedMotif.name} (${selectedMotif.role})\nNotes: ${notesList}\nDegrees: ${selectedMotif.degreeLabels.join(' ➔ ')}\nContour: ${selectedMotif.contourShape}\nExample Lyric: "${selectedMotif.exampleLyrics}"\nVocal Tip: ${selectedMotif.vocalTechniqueTip}`;
    
    if (onApplyMelodyNotes) {
      onApplyMelodyNotes(summary);
      setCopiedStatus("Applied to Song!");
      setTimeout(() => {
        setCopiedStatus(null);
        onClose();
      }, 1200);
    } else {
      handleCopyNotes(summary, "Copied to Clipboard");
    }
  };

  if (!isOpen) return null;

  const rootData = KEY_ROOTS.find(k => k.note.startsWith(rootKey)) || KEY_ROOTS[0];
  const activeScaleNotes = currentScaleDef.formula.map(interval => {
    return (rootData.semitones + interval) % 12;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-950 border border-teal-500/50 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-teal-950/60 via-gray-950 to-indigo-950/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-2xl text-teal-300 font-black shadow-lg">
              🎵
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Melody & Scale Motif Guide
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                  {selectedGenre} Theory Studio
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Visual pitch contours, interactive piano keyboard, audio motif synth & AI melody architect
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-all text-lg cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Global Controls & Key/Scale Bar */}
        <div className="p-4 bg-gray-900/90 border-b border-gray-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Genre Select */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1">
              1. Genre Style
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {Object.keys(GENRE_MELODY_PROFILES).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Root Key Select */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1">
              2. Song Key (Root)
            </label>
            <select
              value={rootKey}
              onChange={(e) => setRootKey(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {KEY_ROOTS.map((k) => (
                <option key={k.note} value={k.note.split(' ')[0]}>{k.note}</option>
              ))}
            </select>
          </div>

          {/* Scale / Mode Select */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1">
              3. Suggested Scale / Mode
            </label>
            <select
              value={selectedScaleType}
              onChange={(e) => setSelectedScaleType(e.target.value as ScaleFormulaType)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-teal-300 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {Object.values(SCALE_DEFINITIONS).map((s) => (
                <option key={s.id} value={s.id}>{s.name.split('(')[0]}</option>
              ))}
            </select>
          </div>

          {/* Synth Tone & Tempo */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1">
                4. Tone
              </label>
              <select
                value={synthSound}
                onChange={(e) => setSynthSound(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-indigo-300 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="triangle">🎹 Warm Piano</option>
                <option value="sine">🌊 Vocal Flute</option>
                <option value="sawtooth">⚡ 80s Synth Lead</option>
                <option value="square">👾 Pluck Arp</option>
              </select>
            </div>

            <div className="w-20">
              <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1">
                BPM ({bpm})
              </label>
              <input
                type="range"
                min="60"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-teal-400 mt-2"
              />
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gray-950 border-b border-gray-800 text-xs gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab('motifs')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'motifs' ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              <span>🎼 Genre Motifs Library</span>
            </button>

            <button
              onClick={() => setActiveTab('contour')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'contour' ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              <span>📈 Visual Pitch Contour</span>
            </button>

            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'visualizer' ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              <span>🎹 Piano Keyboard & Ladder</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_architect')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai_architect' ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" : "text-purple-300 hover:text-white"
              }`}
            >
              <span>✨ AI Melody Architect</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Scale: <strong>{rootKey} {currentScaleDef.id.replace('_', ' ').toUpperCase()}</strong></span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: GENRE MOTIFS LIBRARY */}
          {/* ========================================================================= */}
          {activeTab === 'motifs' && (
            <div className="space-y-6 animate-fade-in">
              {/* Theory Summary Header Card */}
              <div className="bg-gradient-to-r from-teal-950/40 via-gray-900 to-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-teal-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                      Genre Melody DNA
                    </span>
                    <h4 className="text-lg font-black text-white mt-0.5">
                      Why {currentScaleDef.name} Powers {selectedGenre}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-950 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30 text-xs font-bold">
                      {currentScaleDef.vibe}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300 leading-relaxed">
                  <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400 block">
                      🎯 Pitch Center & Range Rule:
                    </span>
                    <p>{genreProfile.pitchCenterGuidance}</p>
                  </div>

                  <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-indigo-400 block">
                      🌊 Leaps vs Steps Motion:
                    </span>
                    <p>{genreProfile.leapVsStepGuidance}</p>
                  </div>
                </div>

                <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                  <span className="text-base">⚠</span>
                  <div>
                    <strong className="font-bold">Trap to Avoid in {selectedGenre}:</strong> {genreProfile.genreTrapsToAvoid}
                  </div>
                </div>
              </div>

              {/* Motifs Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-sm text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <span>Iconic {selectedGenre} Melodic Motifs</span>
                    <span className="text-xs text-gray-500 font-normal">({genreProfile.motifs.length} Presets)</span>
                  </h5>
                  <span className="text-[11px] text-gray-400">Click ▶ Play to hear in {rootKey}</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {genreProfile.motifs.map((motif) => {
                    const isSelected = selectedMotif?.id === motif.id;
                    const isCurrentPlaying = isPlayingMotif && isSelected;
                    const motifNotes = motif.semitoneSteps.map(s => getNoteNameFromSemitone(rootData.semitones, s, 4));

                    return (
                      <div
                        key={motif.id}
                        onClick={() => setSelectedMotif(motif)}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gray-900 border-teal-500 shadow-xl ring-1 ring-teal-500/50"
                            : "bg-gray-950/80 border-gray-800 hover:border-gray-700 hover:bg-gray-900/60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMotif(motif);
                                if (isCurrentPlaying) {
                                  stopMotifPlayback();
                                } else {
                                  playMotifSequence(motif);
                                }
                              }}
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all shadow-lg active:scale-95 cursor-pointer ${
                                isCurrentPlaying
                                  ? "bg-amber-500 text-gray-950 shadow-amber-500/50 animate-pulse"
                                  : "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/30"
                              }`}
                              title={isCurrentPlaying ? "Stop Motif" : "Play Melodic Motif"}
                            >
                              {isCurrentPlaying ? "" : "▶"}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <h6 className="font-black text-base text-white">{motif.name}</h6>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  motif.role.includes('Chorus') 
                                    ? "bg-amber-950/80 text-amber-300 border-amber-500/40" 
                                    : motif.role.includes('Lift')
                                    ? "bg-purple-950/80 text-purple-300 border-purple-500/40"
                                    : "bg-blue-950/80 text-blue-300 border-blue-500/40"
                                }`}>
                                  {motif.role}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{motif.whyItFitsGenre}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800 text-teal-300">
                              Contour: {motif.contourShape}
                            </span>
                          </div>
                        </div>

                        {/* Note & Syllable Progression Sequence */}
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {motifNotes.map((n, nIdx) => {
                              const isNoteActive = isCurrentPlaying && activePlayingNoteIndex === nIdx;
                              const deg = motif.degreeLabels[nIdx];
                              const syl = motif.syllableGuidance[nIdx];

                              return (
                                <div
                                  key={nIdx}
                                  className={`p-2 rounded-xl border text-center transition-all min-w-[58px] ${
                                    isNoteActive
                                      ? "bg-teal-400 text-gray-950 scale-110 font-black shadow-[0_0_15px_rgba(45,212,191,0.8)] border-white"
                                      : "bg-gray-900/90 border-gray-800 text-gray-200"
                                  }`}
                                >
                                  <div className="text-xs font-mono font-black">{n}</div>
                                  <div className="text-[9px] opacity-75">{deg}</div>
                                  <div className="text-[8px] truncate mt-0.5 text-teal-400 font-semibold">{syl}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Example lyrics line & Vocal Delivery tip */}
                          <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/80 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-gray-400 text-[11px]">
                              <span>Example Lyric Line:</span>
                              <span className="italic text-teal-300 font-serif">"{motif.exampleLyrics}"</span>
                            </div>
                            <div className="text-[11px] text-gray-300 flex items-start gap-1.5 pt-1 border-t border-gray-900">
                              <span className="text-purple-400 font-bold">🎙 Vocal Delivery Tip:</span>
                              <span>{motif.vocalTechniqueTip}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: VISUAL PITCH CONTOUR GRAPH */}
          {/* ========================================================================= */}
          {activeTab === 'contour' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-base text-white flex items-center gap-2">
                      <span>Visual Pitch Contour Wave</span>
                      <span className="text-xs text-teal-400 font-normal">
                        ({selectedMotif?.name || "Selected Motif"})
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      Visualizing syllable pitch trajectory, interval jumps, and emotional arc
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedMotif && playMotifSequence(selectedMotif)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{isPlayingMotif ? " Stop" : "▶ Play & Animate Contour"}</span>
                    </button>
                  </div>
                </div>

                {/* SVG Melodic Contour Visualizer */}
                {selectedMotif && (
                  <div className="relative bg-gray-950 p-4 rounded-2xl border border-gray-800 overflow-hidden">
                    <svg viewBox="0 0 700 240" className="w-full h-56">
                      {/* Grid background lines */}
                      <line x1="0" y1="40" x2="700" y2="40" stroke="#374151" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="0" y1="90" x2="700" y2="90" stroke="#374151" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="0" y1="140" x2="700" y2="140" stroke="#374151" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="0" y1="190" x2="700" y2="190" stroke="#374151" strokeDasharray="4 4" strokeWidth="1" />

                      {/* Labels on Y-axis */}
                      <text x="10" y="35" fill="#9ca3af" fontSize="10" fontFamily="monospace">Octave Peak (12)</text>
                      <text x="10" y="85" fill="#9ca3af" fontSize="10" fontFamily="monospace">Fifth / Tension (7)</text>
                      <text x="10" y="135" fill="#9ca3af" fontSize="10" fontFamily="monospace">Major/Minor 3rd (4)</text>
                      <text x="10" y="185" fill="#9ca3af" fontSize="10" fontFamily="monospace">Root Anchor (0)</text>

                      {/* Calculate SVG Coordinates for the motif notes */}
                      {(() => {
                        const count = selectedMotif.semitoneSteps.length;
                        const points = selectedMotif.semitoneSteps.map((step, idx) => {
                          const x = 70 + (idx * ((700 - 140) / Math.max(1, count - 1)));
                          // Normalize pitch 0 to 12 -> y between 190 and 40
                          const y = 190 - (step * (150 / 12));
                          return { x, y, step, idx };
                        });

                        // Generate path string
                        const pathD = points.reduce((acc, pt, i) => {
                          if (i === 0) return `M ${pt.x} ${pt.y}`;
                          const prev = points[i - 1];
                          const cx1 = prev.x + (pt.x - prev.x) / 2;
                          const cy1 = prev.y;
                          const cx2 = prev.x + (pt.x - prev.x) / 2;
                          const cy2 = pt.y;
                          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
                        }, "");

                        return (
                          <>
                            {/* Area fill underneath curve */}
                            <path
                              d={`${pathD} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z`}
                              fill="url(#tealGradient)"
                              opacity="0.15"
                            />

                            {/* Gradient definition */}
                            <defs>
                              <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2dd4bf" />
                                <stop offset="100%" stopColor="#0f766e" />
                              </linearGradient>
                            </defs>

                            {/* Main Melody Curve */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#2dd4bf"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="filter drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                            />

                            {/* Interactive Nodes */}
                            {points.map((pt) => {
                              const isCurrentActive = isPlayingMotif && activePlayingNoteIndex === pt.idx;
                              const noteName = getNoteNameFromSemitone(rootData.semitones, pt.step, 4);
                              const deg = selectedMotif.degreeLabels[pt.idx];
                              const syl = selectedMotif.syllableGuidance[pt.idx];

                              return (
                                <g key={pt.idx} className="cursor-pointer" onClick={() => playTone(calculateNoteFrequency(noteName), 0.5)}>
                                  {/* Pulsing ring if playing */}
                                  {isCurrentActive && (
                                    <circle
                                      cx={pt.x}
                                      cy={pt.y}
                                      r="18"
                                      fill="none"
                                      stroke="#38bdf8"
                                      strokeWidth="2"
                                      className="animate-ping"
                                    />
                                  )}

                                  {/* Node Circle */}
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isCurrentActive ? "11" : "8"}
                                    fill={isCurrentActive ? "#38bdf8" : "#0f172a"}
                                    stroke={isCurrentActive ? "#ffffff" : "#2dd4bf"}
                                    strokeWidth="3"
                                  />

                                  {/* Note Label above */}
                                  <text
                                    x={pt.x}
                                    y={pt.y - 14}
                                    textAnchor="middle"
                                    fill={isCurrentActive ? "#38bdf8" : "#ffffff"}
                                    fontSize="11"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    {noteName}
                                  </text>

                                  {/* Degree tag below */}
                                  <text
                                    x={pt.x}
                                    y={pt.y + 22}
                                    textAnchor="middle"
                                    fill="#9ca3af"
                                    fontSize="9"
                                    fontFamily="sans-serif"
                                  >
                                    {deg}
                                  </text>

                                  {/* Syllable tag below degree */}
                                  <text
                                    x={pt.x}
                                    y={pt.y + 34}
                                    textAnchor="middle"
                                    fill="#2dd4bf"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fontFamily="sans-serif"
                                  >
                                    {syl}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}

                {/* 5 Classic Melodic Archetype Shapes */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    5 Fundamental Melodic Contour Shapes
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {[
                      { name: " The Arch", desc: "Climbs on hook, peaks on power vowel, resolves to root" },
                      { name: "🌊 The Waterfall", desc: "Hits high note first, cascading downward into comfort" },
                      { name: "📈 The Staircase", desc: "Step-by-step upward ladder creating pre-chorus tension" },
                      { name: "〰 The Wave", desc: "Syncopated bounce oscillating between tension & rest" },
                      { name: "🎯 Call-Response", desc: "Open question phrase answered by resolved phrase" }
                    ].map((shape, idx) => (
                      <div key={idx} className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center space-y-1">
                        <div className="font-bold text-teal-300 text-xs">{shape.name}</div>
                        <p className="text-[10px] text-gray-400 leading-tight">{shape.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PIANO KEYBOARD & SCALE DEGREE LADDER */}
          {/* ========================================================================= */}
          {activeTab === 'visualizer' && (
            <div className="space-y-6 animate-fade-in">
              {/* Interactive 2-Octave Piano Keyboard */}
              <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div>
                    <h4 className="font-black text-base text-white flex items-center gap-2">
                      <span>Interactive 2-Octave Scale Keyboard</span>
                      <span className="text-xs text-teal-400 font-normal">
                        ({rootKey} {currentScaleDef.name})
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      Highlighted keys belong to your active scale. Click any key to trigger audio synth.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-teal-400"></span> Scale Notes
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-gray-800 border border-gray-700"></span> Avoid / Dissonant
                    </span>
                  </div>
                </div>

                {/* Piano Keys Visualizer */}
                <div className="overflow-x-auto pb-2">
                  <div className="relative flex justify-center min-w-[620px] h-44 bg-gray-950 p-3 rounded-2xl border border-gray-800 select-none">
                    {/* Render White & Black Keys across 2 octaves (C4 to B5) */}
                    {[4, 5].map((octave) => (
                      <div key={octave} className="relative flex">
                        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((whiteNote) => {
                          const noteFullName = `${whiteNote}${octave}`;
                          const semitoneIndex = NOTE_NAMES_CHROMATIC.indexOf(whiteNote);
                          const isScaleNote = activeScaleNotes.includes(semitoneIndex);
                          const freq = calculateNoteFrequency(noteFullName);
                          const isRoot = semitoneIndex === rootData.semitones;

                          return (
                            <div
                              key={noteFullName}
                              onClick={() => playTone(freq, 0.4)}
                              className={`w-11 sm:w-12 h-36 rounded-b-xl border-r border-b border-l border-gray-800 flex flex-col justify-end items-center pb-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                                isScaleNote
                                  ? isRoot
                                    ? "bg-gradient-to-b from-teal-700 to-teal-500 text-gray-950 font-black shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                                    : "bg-teal-950 text-teal-200 border-teal-500/40 hover:bg-teal-900"
                                  : "bg-gray-900 text-gray-600 hover:bg-gray-800"
                              }`}
                            >
                              <span className="text-[11px] font-mono font-bold">{noteFullName}</span>
                              {isScaleNote && (
                                <span className={`text-[8px] font-extrabold px-1 rounded mt-0.5 ${isRoot ? "bg-gray-950 text-teal-300" : "text-teal-400"}`}>
                                  {isRoot ? "ROOT" : "SCALE"}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* Black Keys */}
                        {[
                          { note: 'C#', offset: 'left-[28px]' },
                          { note: 'D#', offset: 'left-[76px]' },
                          { note: 'F#', offset: 'left-[172px]' },
                          { note: 'G#', offset: 'left-[220px]' },
                          { note: 'A#', offset: 'left-[268px]' }
                        ].map(({ note, offset }) => {
                          const blackFullName = `${note}${octave}`;
                          const semitoneIndex = NOTE_NAMES_CHROMATIC.indexOf(note);
                          const isScaleNote = activeScaleNotes.includes(semitoneIndex);
                          const isRoot = semitoneIndex === rootData.semitones;
                          const freq = calculateNoteFrequency(blackFullName);

                          return (
                            <div
                              key={blackFullName}
                              onClick={(e) => {
                                e.stopPropagation();
                                playTone(freq, 0.4);
                              }}
                              className={`absolute ${offset} top-0 w-7 sm:w-8 h-24 rounded-b-lg z-20 flex flex-col justify-end items-center pb-2 transition-all cursor-pointer shadow-xl active:scale-95 border ${
                                isScaleNote
                                  ? isRoot
                                    ? "bg-amber-400 text-gray-950 font-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                                    : "bg-teal-500 text-gray-950 font-bold border-teal-300"
                                  : "bg-gray-950 text-gray-500 border-gray-700 hover:bg-gray-900"
                              }`}
                            >
                              <span className="text-[9px] font-mono font-bold">{note}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scale Degree Harmonic Function Matrix */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase text-teal-400 tracking-wider">
                    Scale Degree Emotional Functions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-950 p-3 rounded-xl border border-emerald-500/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <span>🟢 1st & 5th Degrees (Anchor)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Total resolution, strength, and grounding. End your chorus lines on the 1st or 5th for a satisfying, resolute finish.
                      </p>
                    </div>

                    <div className="bg-gray-950 p-3 rounded-xl border border-amber-500/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <span>🟡 3rd & 6th Degrees (Emotion)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Defines the emotional color (major uplifting vs minor sorrow). Great for verse storytelling and sweet lyrical sentiments.
                      </p>
                    </div>

                    <div className="bg-gray-950 p-3 rounded-xl border border-rose-500/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                        <span>🔴 2nd, 4th & 7th Degrees (Tension)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Yearning, unanswered questions, and pre-chorus suspension. Demands resolution to the root or third.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AI MELODY ARCHITECT (GEMINI API) */}
          {/* ========================================================================= */}
          {activeTab === 'ai_architect' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-purple-950/40 via-gray-900 to-indigo-950/40 p-5 rounded-2xl border border-purple-500/40 space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                    Gemini AI Vocal Arranger
                  </span>
                  <h4 className="text-lg font-black text-white mt-0.5">
                    Map Your Lyrics to Melodic Pitch Contours
                  </h4>
                  <p className="text-xs text-gray-400">
                    Enter any lyric line to receive a syllable-by-syllable pitch assignment, scale degree mapping, and vocal phrasing advice.
                  </p>
                </div>

                {/* Input form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                       Lyric Line to Analyze & Map
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={lyricLineInput}
                        onChange={(e) => setLyricLineInput(e.target.value)}
                        placeholder="e.g. Tell me that you remember the midnight lights..."
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateAiMelody}
                        disabled={isGeneratingMelody || !lyricLineInput.trim()}
                        className={`px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isGeneratingMelody
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-95"
                        }`}
                      >
                        {isGeneratingMelody ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Arranging Melody...</span>
                          </>
                        ) : (
                          <span>✨ Generate Vocal Melody</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results display */}
                {aiMelodyResult && (
                  <div className="bg-gray-950 p-5 rounded-2xl border border-purple-500/40 space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-purple-400">
                          {aiMelodyResult.contourType} Melodic Contour
                        </span>
                        <h5 className="text-base font-black text-white">{aiMelodyResult.shapeName}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={playAiMelody}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                        >
                          <span>{isPlayingMotif ? " Stop" : "▶ Play AI Melody"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Syllable Progression Card Grid */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        Syllable-by-Syllable Pitch Blueprint
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {aiMelodyResult.syllableBreakdown.map((item, idx) => {
                          const isNoteActive = isPlayingMotif && activePlayingNoteIndex === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => playTone(calculateNoteFrequency(item.note), (item.duration || 0.5) * (60 / bpm))}
                              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer min-w-[70px] ${
                                isNoteActive
                                  ? "bg-purple-400 text-gray-950 scale-110 font-black shadow-[0_0_15px_rgba(192,132,252,0.8)] border-white"
                                  : "bg-gray-900 border-gray-800 hover:border-purple-500/50"
                              }`}
                            >
                              <div className="text-xs font-black text-purple-300">{item.note}</div>
                              <div className="text-[10px] text-gray-300 font-bold truncate">"{item.syllable}"</div>
                              <div className="text-[8px] opacity-75">{item.degree}</div>
                              <div className="text-[7px] text-teal-400 truncate mt-0.5">{item.expressionTip}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Genre Rationale & Vocal Guidance */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-teal-400 block">
                          🧠 Why This Fits {selectedGenre}:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{aiMelodyResult.genreRationale}</p>
                      </div>

                      <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-indigo-400 block">
                          🎙 Vocal Technique & Phrasing:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{aiMelodyResult.vocalGuide}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>💡 Pro-tip: Major Pentatonic guarantees clash-free hooks; Dorian adds luxurious soul.</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedMotif && (
              <button
                type="button"
                onClick={handleApplyToSong}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{copiedStatus || "📥 Apply Melody Guide to Song"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// =========================================================================
// Theme-Based Single Song Generator Component
export default MelodyGuidanceModal;
