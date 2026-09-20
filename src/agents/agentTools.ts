import { AgentToolId } from "./agentTypes";
import { executeUniversalLLMCallStrict } from "./llmRegistry";

export interface ToolExecutionInput {
  toolId: AgentToolId;
  parameters: Record<string, any>;
  modelId?: string;
}

export interface ToolExecutionResult {
  toolId: AgentToolId;
  success: boolean;
  data: any;
  summaryText: string;
  error?: string;
}

export async function executeAgentTool(input: ToolExecutionInput): Promise<ToolExecutionResult> {
  const modelId = input.modelId || "gemini_2_5_flash";

  try {
    switch (input.toolId) {
      // 1. Trend Synthesis (knowledge-based — no live web access)
      case "search_web_music_trends":
      case "simulate_music_trends": {
        const query = input.parameters.query || "Billboard hot 100 pop hooks and viral streaming structures 2026";
        const genre = input.parameters.genre || "Pop";

        const systemPrompt = `You are Clio, the Music Trend Synthesis Analyst.
You have NO live web access. Synthesize plausible music trends, streaming hit metrics, viral hook techniques, and sonic tropes from your training knowledge, and state clearly that this is a knowledge-based synthesis, not real-time research.`;

        const userPrompt = `Provide a music trend synthesis briefing (model knowledge, not live data) for:
Query: "${query}"
Genre: "${genre}"

Provide:
1. Top Charting References (3 hit tracks & artists from your knowledge)
2. Song Structure & Pacing Trends (ideal intro length, hook placement)
3. Lyrical & Thematic Tropes (trending vocabulary, emotional themes)
4. Sonic & Production Cues (tempo ranges, instrumentation, drum patterns)

Open with exactly one line: "⚠ Synthesized from model training knowledge — NOT live web or real-time chart data."
Return as a clean, highly formatted markdown briefing with bold headings.`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt,
          temperature: 0.7
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { raw: result, query, genre, liveWebAccess: false },
          summaryText: result
        };
      }

      // 2. Generate Lyrics Structure
      case "generate_lyrics_structure": {
        const theme = input.parameters.theme || "Heartbreak in a neon city";
        const genre = input.parameters.genre || "Synthwave Pop";
        const mood = input.parameters.mood || "Nostalgic & Energetic";
        const rhymeScheme = input.parameters.rhymeScheme || "AABB / ABAB";

        const systemPrompt = `You are Hermes, the master hitmaker lyricist.
Write complete, radio-ready lyrics formatted with clear section headers: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro].
Focus on powerful imagery, high-tension pre-choruses, and punchy 3-second earworm hooks.`;

        const userPrompt = `Write full lyrics for:
- Theme: ${theme}
- Genre: ${genre}
- Mood: ${mood}
- Rhyme Scheme: ${rhymeScheme}

Ensure every line has musical meter and rhythmic scansion.`;

        const lyrics = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt,
          temperature: 0.85
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { lyrics, theme, genre, mood },
          summaryText: lyrics
        };
      }

      // 3. Rhyme & Cadence Analyzer
      case "rhyme_and_cadence_analyzer": {
        const lyricsText = input.parameters.lyricsText || "";

        const systemPrompt = `You are an expert lyric prosody and meter analyst.
Examine the lyrics line by line for:
1. Syllable counts and stress patterns (iambic, trochaic, syncopated)
2. Rhyme types (perfect, slant, assonance, internal rhymes)
3. Rhythm bottlenecks or awkward tongue-twisters.`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt: `Analyze these lyrics for rhythm and rhyme density:\n\n${lyricsText.slice(0, 1500)}`,
          temperature: 0.4
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { analysis: result },
          summaryText: result
        };
      }

      // 4. Chord Progression Architect
      case "chord_progression_architect": {
        const key = input.parameters.key || "C Major";
        const genre = input.parameters.genre || "Pop";
        const emotionalArc = input.parameters.emotionalArc || "Triumphant Build to Catharsis";

        const systemPrompt = `You are Harmonia, the Harmonic Architect and Theory Master.
Design complete chord progression charts for all song sections (Verse, Pre-Chorus, Chorus, Bridge) with Roman numerals, specific chord voicings (e.g. Cmaj7, Am9, Fadd9), emotional tension notes, and suggested bass motion.`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt: `Design a harmonic chord chart for:
- Key: ${key}
- Genre: ${genre}
- Emotional Arc: ${emotionalArc}`,
          temperature: 0.6
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { chordChart: result, key, genre },
          summaryText: result
        };
      }

      // 5. Melody & Scale Motif Builder
      case "melody_scale_motif_builder": {
        const genre = input.parameters.genre || "Pop";
        const sectionType = input.parameters.sectionType || "Chorus";
        const key = input.parameters.key || "C Major";

        const systemPrompt = `You are Calliope, Melody & Vocal Cadence Architect.
Provide actionable melodic motif guides:
1. Recommended Scale & Mode (e.g. Major Pentatonic, Dorian, Aeolian)
2. Pitch Contour Trajectory (Arch, Waterfall, Staircase, Octave Leap)
3. Scale Degree Formula & Earworm Intervals (e.g. 5 - 5 - 5 - 3 - 1 - 3 - 5)
4. Syllabic Stress and Vowel Placement Tips for optimal vocal belting.`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt: `Build a ${sectionType} melodic hook motif for ${genre} in ${key}.`,
          temperature: 0.75
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { motifGuide: result, genre, sectionType, key },
          summaryText: result
        };
      }

      // 6. Critique Song Commercial Viability (A&R Audit)
      case "critique_song_commercial_viability": {
        const title = input.parameters.title || "Untitled Track";
        const genre = input.parameters.genre || "Pop";
        const lyricsSnippet = input.parameters.lyricsSnippet || "";

        const systemPrompt = `You are Quincy, the legendary Executive Producer and A&R Critic.
Conduct a rigorous, objective commercial and artistic audit of the song.`;

        const userPrompt = `Audit this song:
Title: "${title}"
Genre: "${genre}"
Lyrics / Concept:
${lyricsSnippet.slice(0, 1500)}

Score the following from 1 to 100:
- Commercial Radio & Streaming Viability
- Hook Memorability & Earworm Factor
- Lyrical Originality (Cliché Resistance)
- Emotional Resonance

Then provide:
1. 3 Specific Strengths
2. 3 Surgical Fixes (lines to rewrite, structural edits)
3. Verdict & Next Production Steps.`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt,
          temperature: 0.5
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { audit: result, title, genre },
          summaryText: result
        };
      }

      // 7. Generate Album Art Direction
      case "generate_album_art_direction": {
        const songTitle = input.parameters.songTitle || "Electric Sunset";
        const genre = input.parameters.genre || "Synthwave Pop";
        const mood = input.parameters.mood || "Euphoric & Nostalgic";

        const systemPrompt = `You are Iris, Creative Art Director.
Create an evocative visual direction package for the album cover:
1. High-Detail AI Image Prompt (lighting, camera, medium, textures, atmosphere)
2. Color Palette (4 complementary Hex codes with emotional descriptions)
3. Typography & Composition Pairing (fonts, layout balance, negative space).`;

        const result = await executeUniversalLLMCallStrict({
          modelId,
          systemPrompt,
          userPrompt: `Create album art direction for: "${songTitle}" (${genre}, ${mood}).`,
          temperature: 0.8
        });

        return {
          toolId: input.toolId,
          success: true,
          data: { visualDirection: result, songTitle, genre },
          summaryText: result
        };
      }

      // 8. Apply to Active Song Workspace
      // This tool only prepares a payload — the UI/modal Apply action (or a
      // wired onApplySongUpdate callback) is what mutates the song workspace.
      case "apply_to_current_song": {
        return {
          toolId: input.toolId,
          success: true,
          data: {
            applied: false,
            prepared: true,
            title: input.parameters.title,
            lyrics: input.parameters.lyrics,
            chords: input.parameters.chords,
            customIdeas: input.parameters.customIdeas
          },
          summaryText: "Prepared song update payload (not written to workspace — use Apply Results)."
        };
      }

      default:
        throw new Error(`Unrecognized toolId: ${input.toolId}`);
    }
  } catch (err: any) {
    console.error(`Tool execution failed for ${input.toolId}:`, err);
    return {
      toolId: input.toolId,
      success: false,
      data: null,
      summaryText: `Error running tool: ${err.message || String(err)}`,
      error: err.message || String(err)
    };
  }
}
