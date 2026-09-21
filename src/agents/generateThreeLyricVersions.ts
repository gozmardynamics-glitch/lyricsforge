/**
 * Shared Album Studio lyric-version pipeline.
 * Always returns THREE distinct lyric versions (string[][]).
 * Used by the SPA, the REST API, and the offline album generation runner.
 */
import { executeUniversalLLMCallDetailed } from "./llmRegistry";
import { generateProceduralLyricVersions } from "./proceduralLyrics";

export interface LyricVersionRequest {
  title: string;
  genre: string;
  mood: string;
  albumName?: string;
  occasion?: string;
  albumComments?: string;
  customIdeas?: string;
  structure?: string;
  rhymeScheme?: string;
  language?: string;
  modelId?: string;
  stylePresetNote?: string;
  /** Abort in-flight LLM work (kill-switch / user Stop) */
  signal?: AbortSignal;
}

export interface LyricVersionResult {
  versions: string[][];
  usedFallback: boolean;
  fallbackReason?: string;
  modelId: string;
}

const VERSION_JSON_INSTRUCTION = `6. Adhere strictly to JSON schema: {"lyricVersions": [["Line 1", "Line 2"], ["Version 2 Line 1"], ["Version 3 Line 1"]]}
7. Produce EXACTLY THREE distinct lyric versions in lyricVersions.`;

export function buildAlbumLyricPrompt(req: LyricVersionRequest, languageName = "English"): string {
  return `You are an expert hitmaker lyricist. Write lyrics for a song with the following details.

Album Name: "${req.albumName || req.albumComments || "Studio Album"}"
Album Occasion/Theme: ${req.occasion || "Birthday Celebration"} (${req.albumComments || ""})

Song Title: "${req.title}"
Song Genre: ${req.genre}
Target lyric language: ${languageName} (${req.language || "en"})
Rhyme Scheme Requirement: Strictly follow ${req.rhymeScheme || "ABAB (Alternate Rhyme)"} rhyme scheme for stanzas.
Emotional Mood/Vibe: ${req.mood}
Desired Structure: ${req.structure || "Verse - Chorus - Verse - Chorus - Bridge - Chorus"}
Key Ideas/Keywords from user: "${req.customIdeas || ""}"
${req.stylePresetNote ? `${req.stylePresetNote}` : ""}

Instructions:
1. Generate THREE distinct versions of the lyrics for this song.
2. ALL lyric lines and section content MUST be written in ${languageName}.
3. Follow the requested ${req.rhymeScheme || "ABAB"} rhyme scheme for verses and choruses.
4. Incorporate the requested emotional tone "${req.mood}".
5. Format section headers in markdown like [Verse 1], [Chorus], [Bridge], [Outro].
${VERSION_JSON_INSTRUCTION}
`;
}

function coerceVersions(raw: unknown): string[][] {
  const versions: string[][] = [];
  const push = (v: unknown) => {
    if (Array.isArray(v)) {
      const lines = v.map((l) => String(l)).filter((l) => l.length > 0);
      if (lines.length > 0) versions.push(lines);
    } else if (typeof v === "string" && v.trim()) {
      versions.push(v.split("\n").map((l) => l).filter((l) => l.length > 0));
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach(push);
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.lyricVersions)) obj.lyricVersions.forEach(push);
    else if (Array.isArray(obj.versions)) obj.versions.forEach(push);
  } else if (typeof raw === "string") {
    try {
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      const slice = first !== -1 && last > first ? raw.slice(first, last + 1) : raw;
      return coerceVersions(JSON.parse(slice));
    } catch {
      const stripped = raw.includes("\n\n") && raw.startsWith("[PROCEDURAL")
        ? raw.substring(raw.indexOf("\n\n") + 2).trim()
        : raw.trim();
      if (stripped) versions.push(stripped.split("\n").filter(Boolean));
    }
  }
  return versions.filter((v) => v.length > 0);
}

function padToThree(
  versions: string[][],
  req: LyricVersionRequest
): string[][] {
  const ctx = {
    title: req.title,
    genre: req.genre,
    mood: req.mood,
    customIdeas: req.customIdeas,
    albumName: req.albumName,
    occasion: req.occasion,
    albumComments: req.albumComments,
    structure: req.structure,
    rhymeScheme: req.rhymeScheme,
    language: req.language,
  };
  const proc = generateProceduralLyricVersions(ctx, 3);
  const out = versions.slice(0, 3).map((v) => (v.length ? v : []));
  while (out.length < 3) {
    const filler = proc[out.length % 3];
    const last = out[out.length - 1] || [];
    out.push(filler?.length ? [...filler] : last.length ? [...last] : ["[Verse 1]", "Lyrics pending"]);
  }
  // Ensure every slot is non-empty
  for (let i = 0; i < 3; i++) {
    if (!out[i] || out[i].length === 0) {
      out[i] = [...(proc[i] || ["[Verse 1]", "Lyrics pending"])];
    }
  }
  return out;
}

/**
 * Run the Album Studio lyric generation pipeline for one song.
 * Returns always 3 versions. Falls back to procedural offline lyrics.
 */
export async function generateThreeLyricVersions(
  req: LyricVersionRequest,
  languageName = "English"
): Promise<LyricVersionResult> {
  const modelId = req.modelId || "gemini_2_5_flash";
  const prompt = buildAlbumLyricPrompt(req, languageName);

  const llmResult = await executeUniversalLLMCallDetailed({
    modelId,
    userPrompt: prompt,
    systemPrompt:
      "You are Hermes, master hitmaker lyricist. Always return JSON with exactly three distinct lyricVersions arrays of lyric lines.",
    responseFormat: "json",
    jsonSchema: {
      type: "object",
      properties: {
        lyricVersions: {
          type: "array",
          items: { type: "array", items: { type: "string" } },
        },
      },
      required: ["lyricVersions"],
    },
    temperature: 0.85,
    maxTokens: 4000,
    signal: req.signal,
  });

  if (req.signal?.aborted) {
    throw new DOMException("Lyric generation aborted by user", "AbortError");
  }

  const text = llmResult?.text ?? "";
  let versions = coerceVersions(text);
  const looksFallback = Boolean(llmResult?.usedFallback) || text.startsWith("[PROCEDURAL");

  if (versions.length < 3 || looksFallback) {
    const procedural = generateProceduralLyricVersions(
      {
        title: req.title,
        genre: req.genre,
        mood: req.mood,
        customIdeas: req.customIdeas,
        albumName: req.albumName,
        occasion: req.occasion,
        albumComments: req.albumComments,
        structure: req.structure,
        rhymeScheme: req.rhymeScheme,
        language: req.language,
      },
      3
    );
    if (versions.length === 0 || looksFallback) versions = procedural;
    else versions = padToThree(versions, req);
    return {
      versions,
      usedFallback: true,
      fallbackReason:
        llmResult?.error ||
        "Provider unavailable or returned fewer than 3 versions — procedural variants used",
      modelId,
    };
  }

  return {
    versions: padToThree(versions, req),
    usedFallback: false,
    modelId,
  };
}
