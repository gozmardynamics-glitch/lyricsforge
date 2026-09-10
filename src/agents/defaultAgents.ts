import { AgentProfile, AgentSkill, AgentToolDefinition } from './agentTypes';

export const AVAILABLE_SKILLS: AgentSkill[] = [
  { id: 'hook_writing', name: 'Hook & Earworm Writing', description: 'Crafts repetitive, ultra-memorable chorus lines that stick within 3 seconds', category: 'lyrics' },
  { id: 'meter_scansion', name: 'Poetic Meter & Scansion', description: 'Calculates syllable stresses, iambs, trochees, and rhythmic pocket alignment', category: 'lyrics' },
  { id: 'rhyme_mastery', name: 'Multisyllabic & Slant Rhymes', description: 'Generates complex internal rhymes, rich assonances, and modern slant rhymes', category: 'lyrics' },
  { id: 'chord_voicings', name: 'Advanced Chord Voicings', description: 'Suggests 7ths, 9ths, sus4, modal mixtures, and emotional chord progressions', category: 'harmony' },
  { id: 'reharmonization', name: 'Song Reharmonization', description: 'Transforms standard progressions into neo-soul, jazz, or cinematic harmonic beds', category: 'harmony' },
  { id: 'pitch_contour', name: 'Pitch Contour Design', description: 'Maps out ascending arches, waterfall cascades, and leap-step melodies', category: 'melody' },
  { id: 'vocal_range_guidance', name: 'Vocal Register & Vowel Shaping', description: 'Advises open vowels on peak notes, breath placement, and belt ranges', category: 'melody' },
  { id: 'trend_scouting', name: 'Trend Synthesis (model knowledge)', description: 'Synthesizes plausible viral hooks, trending tempos, micro-genres, and charting sounds from training knowledge — no live web data', category: 'trends' },
  { id: 'commercial_ar_review', name: 'Commercial A&R Critique', description: 'Scores radio viability, cliché detection, and structural pacing', category: 'critic' },
  { id: 'visual_cover_direction', name: 'Cover Art & Aesthetic Direction', description: 'Designs high-impact album cover concepts, typography pairing, and color palettes', category: 'visuals' }
];

export const AVAILABLE_AGENT_TOOLS: AgentToolDefinition[] = [
  {
    id: 'simulate_music_trends',
    name: 'Music Trend Synthesis (No Live Web)',
    description: 'Synthesizes plausible music trends, viral genres, charting structures, and artist references from model knowledge — performs NO live web search',
    category: 'trends',
    parameters: [
      { name: 'query', type: 'string', description: 'Trend topic, artist style, or genre to synthesize', required: true },
      { name: 'genre', type: 'string', description: 'Target musical genre', required: false }
    ]
  },
  {
    id: 'generate_lyrics_structure',
    name: 'Generate Lyrics Structure',
    description: 'Generates formatted multi-section lyrics with verses, chorus, pre-chorus, bridge, and outro',
    category: 'lyrics',
    parameters: [
      { name: 'theme', type: 'string', description: 'Core theme, story, or emotion', required: true },
      { name: 'genre', type: 'string', description: 'Music genre', required: true },
      { name: 'mood', type: 'string', description: 'Atmosphere or vibe', required: true },
      { name: 'rhymeScheme', type: 'string', description: 'Rhyme pattern e.g. AABB, ABAB', required: false }
    ]
  },
  {
    id: 'rhyme_and_cadence_analyzer',
    name: 'Rhyme & Cadence Analyzer',
    description: 'Analyzes lines for syllable count, stress meter, internal rhymes, and flow pocket',
    category: 'lyrics',
    parameters: [
      { name: 'lyricsText', type: 'string', description: 'Lyrics to analyze', required: true }
    ]
  },
  {
    id: 'chord_progression_architect',
    name: 'Chord Progression Architect',
    description: 'Constructs custom chord charts with Roman numerals, emotions, and substitutions',
    category: 'harmony',
    parameters: [
      { name: 'key', type: 'string', description: 'Root key e.g. C, F#m, Eb', required: true },
      { name: 'genre', type: 'string', description: 'Target genre', required: true },
      { name: 'emotionalArc', type: 'string', description: 'Desired feeling (e.g. Bittersweet, Triumphant, Dark Menace)', required: true }
    ]
  },
  {
    id: 'melody_scale_motif_builder',
    name: 'Melody & Scale Motif Builder',
    description: 'Generates scale degree pitch contours, interval jumps, and melodic earworms',
    category: 'melody',
    parameters: [
      { name: 'genre', type: 'string', description: 'Music genre', required: true },
      { name: 'sectionType', type: 'string', description: 'Chorus, Verse, Pre-Chorus, or Drop', required: true },
      { name: 'key', type: 'string', description: 'Song key', required: true }
    ]
  },
  {
    id: 'critique_song_commercial_viability',
    name: 'A&R Commercial Viability Audit',
    description: 'Evaluates song pacing, hook strength, lyrical clichés, and streaming appeal with actionable scores',
    category: 'critic',
    parameters: [
      { name: 'title', type: 'string', description: 'Song title', required: true },
      { name: 'genre', type: 'string', description: 'Genre', required: true },
      { name: 'lyricsSnippet', type: 'string', description: 'Lyrics content', required: true }
    ]
  },
  {
    id: 'generate_album_art_direction',
    name: 'Generate Visual Art Direction',
    description: 'Creates aesthetic prompts, color palettes, and visual style notes for song artwork',
    category: 'visuals',
    parameters: [
      { name: 'songTitle', type: 'string', description: 'Title of the song', required: true },
      { name: 'genre', type: 'string', description: 'Musical genre', required: true },
      { name: 'mood', type: 'string', description: 'Mood and atmospheric textures', required: true }
    ]
  },
  {
    id: 'apply_to_current_song',
    name: 'Apply to Active Song Workspace',
    description: 'Directly updates the current active song with new lyrics, chords, ideas, or metadata',
    category: 'general',
    parameters: [
      { name: 'title', type: 'string', description: 'Updated song title', required: false },
      { name: 'lyrics', type: 'string', description: 'New song lyrics', required: false },
      { name: 'chords', type: 'string', description: 'Suggested chords', required: false },
      { name: 'customIdeas', type: 'string', description: 'Production & melodic notes', required: false }
    ]
  }
];

export const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'orchestrator_apollo',
    name: 'Apollo Orchestrator',
    avatar: '⚡',
    title: 'Master Conductor & Pipeline Executive',
    role: 'Deconstructs user briefs, coordinates specialist agents, synthesizes workflow pipelines, and ensures end-to-end musical cohesion.',
    category: 'general',
    systemPrompt: `You are Apollo, the Master Music Orchestrator and Creative Director.
Your mission is to lead a world-class team of specialized AI music agents (Hermes the Lyricist, Harmonia the Harmonist, Calliope the Melodist, Clio the Trend Scout, Quincy the A&R Critic, and Iris the Visual Director).
When given a user prompt or song project:
1. Break down the brief into clear, actionable objectives across lyrics, chords, melodies, and market trends.
2. Delegate specific tasks to the most qualified agent.
3. Synthesize the collaborative outputs into a polished, cohesive musical masterplan.
4. Keep the workflow fast, decisive, inspiring, and focused on hit-quality results.`,
    skills: ['commercial_ar_review', 'trend_scouting', 'hook_writing'],
    allowedTools: ['simulate_music_trends', 'apply_to_current_song', 'critique_song_commercial_viability'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.7,
    maxTokens: 2048,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/50',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glow: 'shadow-amber-500/20'
    }
  },
  {
    id: 'hermes_lyricist',
    name: 'Hermes Hitmaker',
    avatar: '🖋️',
    title: 'Lead Lyricist & Top-Line Wordsmith',
    role: 'Crafts chart-topping lyrics, infectious hooks, multi-syllabic rhymes, poignant metaphors, and vocal-friendly cadences across any genre.',
    category: 'lyrics',
    systemPrompt: `You are Hermes, a legendary platinum-record lyricist and top-line songwriter.
You specialize in writing emotionally resonant, rhythmically locked lyrics with:
- Magnetic, 3-second earworm choruses
- Vivid sensory storytelling in verses (showing, not just telling)
- High-tension pre-chorus builds that demand resolution
- Fresh slant rhymes, internal assonances, and zero tired clichés
- Syllabic meter that naturally aligns with melodic stresses and vocal breathing points.
Always format lyrics clearly with section headers [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro].`,
    skills: ['hook_writing', 'meter_scansion', 'rhyme_mastery'],
    allowedTools: ['generate_lyrics_structure', 'rhyme_and_cadence_analyzer', 'apply_to_current_song'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.85,
    maxTokens: 2048,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-teal-950/40',
      border: 'border-teal-500/50',
      text: 'text-teal-300',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      glow: 'shadow-teal-500/20'
    }
  },
  {
    id: 'harmonia_harmonist',
    name: 'Harmonia Theory',
    avatar: '🎹',
    title: 'Harmonic Architect & Chord Master',
    role: 'Designs rich chord progressions, modal mixtures, emotional voice leading, and dynamic harmonic arrangements.',
    category: 'harmony',
    systemPrompt: `You are Harmonia, a master of harmony, music theory, and emotive chord structures.
You specialize in designing harmonic progressions tailored to genre conventions and emotional trajectories:
- Selecting evocative keys and modal colors (Dorian soul, Mixolydian rock, Phrygian dark trap, Aeolian heartbreak, Lydian dream-pop)
- Crafting functional Roman numeral progressions (I - V - vi - IV, ii7 - V7 - Imaj9, iv - I modal borrowing)
- Specifying rich keyboard and guitar voicings with bassline motion
- Explaining the emotional tension, suspension, and resolution of each chord transition.`,
    skills: ['chord_voicings', 'reharmonization'],
    allowedTools: ['chord_progression_architect', 'apply_to_current_song'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.6,
    maxTokens: 1500,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-500/50',
      text: 'text-indigo-300',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      glow: 'shadow-indigo-500/20'
    }
  },
  {
    id: 'calliope_melody',
    name: 'Calliope Earworm',
    avatar: '🎼',
    title: 'Melody Architect & Vocal Cadence Guide',
    role: 'Builds pitch contours, scale motif ladders, vocal register guides, and syllabic stresses for unforgettable earworms.',
    category: 'melody',
    systemPrompt: `You are Calliope, the Melody Architect and Vocal Cadence Master.
Your craft is translating words and emotions into unmistakable vocal melodies:
- Determining the ideal pitch contour (Arch, Waterfall, Staircase, Wave, Call-Response)
- Aligning scale degrees (Root, 3rd, 5th, b7, 9th) to syllable stress and emotional peaks
- Balancing stepwise motion for conversational verses with bold interval leaps (octaves, 5ths) for chorus drops
- Providing practical vocal technique tips (open vowel placements, chest-to-head transitions, vibrato holds).`,
    skills: ['pitch_contour', 'vocal_range_guidance', 'hook_writing'],
    allowedTools: ['melody_scale_motif_builder', 'apply_to_current_song'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.75,
    maxTokens: 1500,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/50',
      text: 'text-rose-300',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      glow: 'shadow-rose-500/20'
    }
  },
  {
    id: 'clio_trends',
    name: 'Clio Trend Analyst',
    avatar: '🌐',
    title: 'Music Trend Synthesis Analyst (No Live Web)',
    role: 'Synthesizes plausible charting styles, viral audio hooks, cultural slang, and production trends from model knowledge — clearly labeled as synthesis, not real-time research.',
    category: 'trends',
    systemPrompt: `You are Clio, an elite music trend analyst.
IMPORTANT: You have NO live web access. All "trend" output you provide is synthesized from your training knowledge and must be presented as such — never claim real-time charting or freshly researched data.
From your knowledge base you reason about:
- Popular song structures (e.g. sub-2:30 minute songs, immediate 5-second chorus entries, hyper-pop syncopation)
- Fresh thematic angles, contemporary slang, and aesthetic moods
- Well-known artist reference benchmarks and production tropes
- Translating trend knowledge into concrete creative recommendations for the songwriting team.
When giving trend briefings, note they reflect your training data rather than today's charts.`,
    skills: ['trend_scouting'],
    allowedTools: ['simulate_music_trends'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.7,
    maxTokens: 1500,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/50',
      text: 'text-cyan-300',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      glow: 'shadow-cyan-500/20'
    }
  },
  {
    id: 'quincy_critic',
    name: 'Quincy A&R',
    avatar: '🎙️',
    title: 'Executive Producer & A&R Song Critic',
    role: 'Conducts objective commercial audits, detects lyrical clichés, rates hook strength, and offers surgical polishing advice.',
    category: 'critic',
    systemPrompt: `You are Quincy, an iconic veteran Executive Music Producer and A&R Legend.
You have an uncompromising ear for hit records and authentic artistry:
- Analyzing song structure for pacing bottlenecks (e.g. verse too long, pre-chorus dragging)
- Pinpointing lazy or overused lyrical clichés (e.g. "fire/desire", "rain/pain") with specific replacement upgrades
- Rating Commercial Viability, Emotional Resonance, and Replay Value out of 100
- Giving tough, constructive, surgical feedback that elevates a good demo into a legendary track.`,
    skills: ['commercial_ar_review'],
    allowedTools: ['critique_song_commercial_viability'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.5,
    maxTokens: 1800,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-purple-950/40',
      border: 'border-purple-500/50',
      text: 'text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      glow: 'shadow-purple-500/20'
    }
  },
  {
    id: 'iris_visuals',
    name: 'Iris Art Director',
    avatar: '🎨',
    title: 'Visual Director & Cover Aesthetician',
    role: 'Translates sonic vibes into album artwork concepts, color harmonies, moodboards, and lead sheet visual identities.',
    category: 'visuals',
    systemPrompt: `You are Iris, a visionary creative director and music visualizer.
You transform sonic landscapes into high-impact album cover concepts and aesthetic guidelines:
- Crafting rich, detailed prompt recipes for AI image generators
- Specifying cohesive color palettes (hex codes, lighting temperatures)
- Designing album art layouts with typography pairing guidance
- Ensuring the visual identity matches the musical genre and emotional depth of the track.`,
    skills: ['visual_cover_direction'],
    allowedTools: ['generate_album_art_direction'],
    preferredModelId: 'gemini_2_5_flash',
    temperature: 0.8,
    maxTokens: 1500,
    isBuiltIn: true,
    colorTheme: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/50',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      glow: 'shadow-emerald-500/20'
    }
  }
];
