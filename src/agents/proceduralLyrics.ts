/**
 * Offline / fallback multi-version lyric generator used by LyricsForge.
 * Produces THREE distinct structured lyric versions from song context so the
 * Album Studio UI remains fully functional without a live LLM API key.
 */

export interface ProceduralSongContext {
  title?: string;
  genre?: string;
  mood?: string;
  customIdeas?: string;
  albumName?: string;
  occasion?: string;
  albumComments?: string;
  structure?: string;
  rhymeScheme?: string;
  language?: string;
  versionCount?: number;
}

const VERSION_FLAVORS = [
  {
    key: "narrative",
    label: "Narrative Story",
    hookStyle: "story-first, warm imagery, family-table detail",
  },
  {
    key: "anthem",
    label: "Anthem / Pop Hook",
    hookStyle: "repeatable chorus hook, singalong energy, short punch lines",
  },
  {
    key: "intimate",
    label: "Intimate / Acoustic",
    hookStyle: "soft confession, close-mic honesty, sparse lines",
  },
] as const;

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

/** Extract song context from the Album Studio generation prompt. */
export function parseSongContextFromPrompt(userPrompt: string): ProceduralSongContext {
  const grab = (label: string): string => {
    const re = new RegExp(`${label}\\s*:\\s*"?([^"\\n]+)"?`, "i");
    const m = userPrompt.match(re);
    return m ? m[1].trim() : "";
  };
  return {
    title: grab("Song Title") || grab("title") || "Untitled Studio Track",
    genre: grab("Song Genre") || grab("Genre") || "Pop",
    mood: grab("Emotional Mood/Vibe") || grab("Mood") || grab("mood") || "Warm Celebration",
    customIdeas: grab("Key Ideas/Keywords from user") || grab("customIdeas") || "",
    albumName: grab("Album Name") || grab("Album Title") || "",
    occasion: grab("Album Occasion/Theme") || grab("Occasion") || grab("Theme") || "",
    albumComments: grab("Album Description") || "",
    structure: grab("Desired Structure") || grab("structure") || "Verse - Chorus - Verse - Chorus - Bridge - Chorus",
    rhymeScheme: grab("Rhyme Scheme Requirement") || grab("rhymeScheme") || "ABAB (Alternate Rhyme)",
    language: grab("Target lyric language") || grab("language") || "English",
  };
}

function sectionHeaders(structure: string, flavor: number): string[] {
  const base = (structure || "Verse - Chorus - Verse - Chorus - Bridge - Chorus")
    .split(/[-–—|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const cleaned = base.map((s) => s.replace(/\s+/g, " "));
  if (flavor === 1 && !cleaned.some((c) => /pre-chorus/i.test(c))) {
    const idx = cleaned.findIndex((c) => /chorus/i.test(c));
    if (idx >= 0) cleaned.splice(idx, 0, "Pre-Chorus");
  }
  return cleaned;
}

function buildLines(
  ctx: ProceduralSongContext,
  flavorIdx: number
): string[] {
  const title = ctx.title || "This Moment";
  const genre = ctx.genre || "Pop";
  const mood = ctx.mood || "Warm Celebration";
  const idea = (ctx.customIdeas || "").trim();
  const occasion = ctx.occasion || "family celebration";
  const album = ctx.albumName || "our story";
  const seed = seedFrom(`${title}|${genre}|${mood}|${flavorIdx}|${idea}`);
  const flavor = VERSION_FLAVORS[flavorIdx % VERSION_FLAVORS.length];

  const detailPool = [
    idea,
    occasion,
    album,
    `a ${mood.toLowerCase()} feeling`,
    genre,
    title,
  ].filter(Boolean);

  const detailA = pick(detailPool, seed);
  const detailB = pick(detailPool, seed + 3);
  const detailC = pick(detailPool, seed + 7);

  const versionsBanks: Record<string, { v1: string[]; chorus: string[]; v2: string[]; bridge: string[]; outro: string[] }> = {
    narrative: {
      v1: [
        `Morning light on familiar ground,`,
        `"${detailA}" is the story that we found,`,
        `Every year adds pages to the book we share,`,
        `Love keeps writing even when we're unaware.`,
        `Kitchen-table wisdom, laughter down the hall,`,
        `"${detailB}" — we still remember all,`,
        `So we sing this ${mood.toLowerCase()} tune for you,`,
        `"${title}" — honest, warm, and true.`,
      ],
      chorus: [
        `Sing it soft, sing it strong — "${title}",`,
        `This is where we know that we belong,`,
        `From the first light to the last goodnight,`,
        `We hold you close in every line tonight.`,
        `"${album}" is more than just a name —`,
        `It's every voice that answers when we call your name.`,
      ],
      v2: [
        `Years go by like trains along the track,`,
        `But "${detailC}" always brings us back,`,
        `Hand in hand through weather and through shine,`,
        `Your story keeps becoming part of mine.`,
        `If ${genre} had a heartbeat, it would beat`,
        `In time with every step and bittersweet`,
        `And beautiful reminder life is brief —`,
        `So we gather now in gratitude, in belief.`,
      ],
      bridge: [
        `Not every hero wears a cape or crown;`,
        `Some build a home and never let it down,`,
        `Some keep the porch light on so we can find`,
        `Our way back home — a steady, faithful kind.`,
      ],
      outro: [
        `"${title}" — we'll keep singing through the years,`,
        `A family hymn beyond applause or tears.`,
      ],
    },
    anthem: {
      v1: [
        `Hands up if you know the feeling — ${mood.toLowerCase()} tonight!`,
        `"${detailA}" — yeah, we're holding on so tight,`,
        `Turn it up, this is our celebration song,`,
        `"${title}" — everybody sing along!`,
        `From the front row to the back of the room,`,
        `"${detailB}" is breaking through the gloom,`,
        `No fancy proof, just love we can't deny —`,
        `We're alive, we're here, we're family — that's why.`,
      ],
      chorus: [
        `Oh-oh-oh — "${title}"!`,
        `Louder now, light up the sky!`,
        `Oh-oh-oh — we're not shy,`,
        `"${album}" — this is our anthem, this is our high!`,
        `Clap it out, stomp the floor,`,
        `We've got love and we want more —`,
        `"${title}" — forever more!`,
      ],
      v2: [
        `Mics on, hearts open, let the chorus hit,`,
        `"${detailC}" — that's the hook, that's it!`,
        `${genre} energy with a family twist,`,
        `Every single blessing on the list.`,
        `If the world gets loud, we get louder still,`,
        `Celebrating everything you are and always will`,
        `Be — a reason we believe in brighter days:`,
        `"${title}" — put your hands up, start the praise!`,
      ],
      bridge: [
        `One more time for the ones who hold us down!`,
        `One more time — make it echo through the town!`,
        `Not for the cameras, not for the fame:`,
        `Just for the love that answers when we call your name.`,
      ],
      outro: [
        `"${title}" — oh-oh-oh — we shout it out,`,
        `Family forever, never in doubt.`,
      ],
    },
    intimate: {
      v1: [
        `I don't need a stage to tell you this,`,
        `"${detailA}" is how the whole song starts —`,
        `A quiet room, an ordinary kiss`,
        `Of light across the years, across our hearts.`,
        `"${title}" is not a headline, not a chart,`,
        `It's how I breathe when everything gets hard,`,
        `It's "${detailB}" and the softest part`,
        `Of loving you — completely, unafraid.`,
      ],
      chorus: [
        `Stay a little longer in this light,`,
        `"${title}" — everything is alright,`,
        `Not perfect, not polished, not a show —`,
        `Just the truest thing I know.`,
        `"${album}" holds us, calm and clear,`,
        `I'm so glad, so glad you're here.`,
      ],
      v2: [
        `The world can have its noise, its rush, its speed;`,
        `I'll keep this ${mood.toLowerCase()} seed`,
        `Of "${detailC}" planted in my chest,`,
        `A simple truth among the ones I love best.`,
        `${genre} doesn't need to shout to last —`,
        `Sometimes it's the whisper, held on fast,`,
        `That carries more than anthems ever could:`,
        `"${title}" — quiet, solid, good.`,
      ],
      bridge: [
        `If I only get one prayer tonight, let it be this:`,
        `May you always know how deeply you are loved —`,
        `Not for what you do, but simply for the gift`,
        `Of being who you are, here, with us.`,
      ],
      outro: [
        `"${title}" — soft as breath, strong as years,`,
        `I'll be singing you the rest of my years.`,
      ],
    },
  };

  const bank = versionsBanks[flavor.key] || versionsBanks.narrative;
  const headers = sectionHeaders(ctx.structure || "", flavorIdx);
  const lines: string[] = [];

  const emit = (sectionName: string, body: string[]) => {
    lines.push(`[${sectionName}]`);
    lines.push(...body);
    lines.push("");
  };

  let chorusUsed = false;
  let v1Used = false;
  let v2Used = false;
  let bridgeUsed = false;

  for (const raw of headers) {
    const name = raw;
    if (/chorus/i.test(name) && !/pre/i.test(name)) {
      emit(chorusUsed ? `${name} (Reprise)` : name, bank.chorus);
      chorusUsed = true;
    } else if (/pre-chorus|prechorus/i.test(name)) {
      emit(name, [
        `Can you feel it building — "${title}" in the air?`,
        `${mood} rising, love beyond compare.`,
      ]);
    } else if (/bridge/i.test(name)) {
      if (!bridgeUsed) {
        emit(name, bank.bridge);
        bridgeUsed = true;
      } else {
        emit(`${name} (Tag)`, bank.outro);
      }
    } else if (/outro|ending/i.test(name)) {
      emit(name, bank.outro);
    } else if (/intro/i.test(name)) {
      emit(name, [
        `"${title}" — ${genre}, ${mood.toLowerCase()} — ready?`,
        `For ${occasion || "this moment"}, for us.`,
      ]);
    } else if (/verse\s*2|verse-2/i.test(name) || (v1Used && !v2Used && /verse/i.test(name))) {
      emit(name, bank.v2);
      v2Used = true;
    } else if (/verse/i.test(name)) {
      if (!v1Used) {
        emit(name, bank.v1);
        v1Used = true;
      } else if (!v2Used) {
        emit(name, bank.v2);
        v2Used = true;
      } else {
        emit(name, [
          `Another verse for everything unsaid,`,
          `"${detailC}" still lives inside my head —`,
          `"${title}" grows richer every year we share.`,
        ]);
      }
    } else {
      emit(name, bank.v1.slice(0, 4));
    }
  }

  if (!lines.some((l) => /\[Chorus\]/i.test(l))) {
    emit("Chorus", bank.chorus);
  }
  if (!chorusUsed) {
    // ensure structure has a hook even if custom structure omitted Chorus
  }

  // Flavor stamp (hidden from display via comment-like trailing note? keep clean)
  lines.push(`(Version ${flavorIdx + 1} · ${flavor.label} · ${flavor.hookStyle})`);
  return lines.filter((l, i, arr) => !(l === "" && i === arr.length - 1));
}

/**
 * Generate N distinct lyric versions (default 3) for a song context.
 * Always returns at least 1, preferably `versionCount` versions.
 */
export function generateProceduralLyricVersions(
  ctx: ProceduralSongContext,
  versionCount = 3
): string[][] {
  const n = Math.max(1, Math.min(5, versionCount || 3));
  const out: string[][] = [];
  for (let i = 0; i < n; i++) {
    out.push(buildLines(ctx, i));
  }
  return out;
}

/**
 * Detect lyric-version JSON requests in prompts and return proper schema output
 * for the offline fallback path.
 */
export function proceduralFallbackForLyricVersions(userPrompt: string): string {
  const ctx = parseSongContextFromPrompt(userPrompt);
  const versions = generateProceduralLyricVersions(ctx, 3);
  return JSON.stringify({ lyricVersions: versions });
}

export const VERSION_FLAVOR_LABELS = VERSION_FLAVORS.map((v) => v.label);
