/**
 * Headless in-app generation run for the 4 family birthday albums.
 * Uses LyricsForge's Album Studio generation path (same prompt + procedural
 * 3-version engine as handleGenerateLyrics / generateProceduralFallback).
 *
 * Run:
 *   node --experimental-strip-types scripts/run_inapp_album_generation.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateProceduralLyricVersions,
  proceduralFallbackForLyricVersions,
  parseSongContextFromPrompt,
} from "../src/agents/proceduralLyrics.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ALBUMS_DIR = join(ROOT, "albums");
const DATA_DIR = join(ROOT, "src", "data");

/** Same prompt shape as index.tsx handleGenerateLyrics */
function buildAlbumStudioPrompt(args: {
  albumName: string;
  occasion: string;
  comments: string;
  title: string;
  genre: string;
  mood: string;
  customIdeas: string;
  structure: string;
  rhymeScheme: string;
  language?: string;
}): string {
  return `You are an expert hitmaker lyricist. Write lyrics for a song with the following details.

Album Name: "${args.albumName}"
Album Occasion/Theme: ${args.occasion} (${args.comments})

Song Title: "${args.title}"
Song Genre: ${args.genre}
Target lyric language: ${args.language || "English"} (en)
Rhyme Scheme Requirement: Strictly follow ${args.rhymeScheme || "ABAB (Alternate Rhyme)"} rhyme scheme for stanzas.
Emotional Mood/Vibe: ${args.mood}
Desired Structure: ${args.structure}
Key Ideas/Keywords from user: "${args.customIdeas}"

Instructions:
1. Generate THREE distinct versions of the lyrics for this song.
2. ALL lyric lines and section content MUST be written in ${args.language || "English"}.
3. Follow the requested ${args.rhymeScheme || "ABAB"} rhyme scheme for verses and choruses.
4. Incorporate the requested emotional tone "${args.mood}".
5. Format section headers in markdown like [Verse 1], [Chorus], [Bridge], [Outro].
6. Adhere strictly to JSON schema: {"lyricVersions": [["Line 1", "Line 2"], ["Version 2 Line 1"], ["Version 3 Line 1"]]}
`;
}

/** Simulate the app generation call: provider unavailable → procedural fallback JSON. */
function generateViaAppPipeline(args: Parameters<typeof buildAlbumStudioPrompt>[0]): {
  lyricVersions: string[][];
  usedFallback: boolean;
  mode: string;
} {
  const prompt = buildAlbumStudioPrompt(args);
  // executeUniversalLLMCall path when no API key: generateProceduralFallback
  const fallbackJson = proceduralFallbackForLyricVersions(prompt);
  const parsed = JSON.parse(fallbackJson) as { lyricVersions: string[][] };
  const versions = parsed.lyricVersions.filter((v) => Array.isArray(v) && v.length > 0);
  if (versions.length < 3) {
    const extra = generateProceduralLyricVersions(parseSongContextFromPrompt(prompt), 3);
    while (versions.length < 3) versions.push(extra[versions.length % 3]);
  }
  return {
    lyricVersions: versions.slice(0, 3),
    usedFallback: true,
    mode: "Album Studio pipeline · offline procedural 3-version engine",
  };
}

type TrackSpec = {
  id: string;
  title: string;
  genre: string;
  mood: string;
  customIdeas: string;
  structure?: string;
  rhymeScheme?: string;
  musicKey?: string;
  tags?: string[];
};

type AlbumSpec = {
  id: string;
  name: string;
  occasion: string;
  comments: string;
  genres: string[];
  tracks: TrackSpec[];
};

const ALBUMS: AlbumSpec[] = [
  {
    id: "album-birthday-grandpa",
    name: "Grandpa's Birthday — Another Candle Light",
    occasion: "Birthday Celebration — Grandpa",
    comments:
      "Family birthday album for Grandpa: porch light, wisdom, hands, open gate, singalong toast.",
    genres: ["Country Folk", "Classic Country", "Jazz Swing", "Gospel Soul"],
    tracks: [
      { id: "gp-01", title: "Another Candle Light", genre: "Country Folk", mood: "Warm Gratitude", customIdeas: "Candles, kitchen table, quiet pride in another year with Grandpa", musicKey: "G Major" },
      { id: "gp-02", title: "Grandpa's Porch Light", genre: "Classic Country", mood: "Nostalgic Comfort", customIdeas: "Always-welcome porch light for anyone who is lost", musicKey: "D Major" },
      { id: "gp-03", title: "Stories in Your Hands", genre: "Acoustic Ballad", mood: "Tender Tribute", customIdeas: "Grandpa's hands tell maps of work and care", musicKey: "A Major" },
      { id: "gp-04", title: "The Chair That Knows You", genre: "Americana Blues", mood: "Quiet Devotion", customIdeas: "Grandpa's cracked leather chair holds a lifetime", musicKey: "E Minor" },
      { id: "gp-05", title: "Wisdom Like Wine", genre: "Jazz Swing", mood: "Playful Respect", customIdeas: "Grandpa's advice aged like fine wine", musicKey: "Bb Major" },
      { id: "gp-06", title: "Hands That Built the House", genre: "Heartland Rock", mood: "Grateful Strength", customIdeas: "Builder, provider, steady foundation of the family", musicKey: "E Major" },
      { id: "gp-07", title: "Sunday With Grandpa", genre: "Gospel Soul", mood: "Sacred Family", customIdeas: "Sunday hymns, biscuits, quiet faith", musicKey: "F Major" },
      { id: "gp-08", title: "Silver and Smoke", genre: "Classic Crooner", mood: "Elegant Toast", customIdeas: "Smooth birthday toast in classic crooner style", musicKey: "F# Major" },
      { id: "gp-09", title: "Keep the Gate Unlatched", genre: "Folk Anthem", mood: "Open Heart", customIdeas: "Grandpa always leaves the garden gate open", musicKey: "C Major" },
      { id: "gp-10", title: "Raise a Glass to Grandpa", genre: "Celebration Pop-Folk", mood: "Joyful Closer", customIdeas: "Whole-family singalong birthday toast finale", musicKey: "D Major" },
    ],
  },
  {
    id: "album-birthday-grandma",
    name: "Grandma's Birthday — Candles for the Queen of Us",
    occasion: "Birthday Celebration — Grandma",
    comments:
      "Family birthday album for Grandma: kitchen hymns, garden seasons, soft strength, radio soul.",
    genres: ["Folk Gospel", "Sweet Pop-Soul", "Piano Ballad", "Retro Soul"],
    tracks: [
      { id: "gm-01", title: "Grandma's Kitchen Hymn", genre: "Folk Gospel", mood: "Gentle Devotion", customIdeas: "Flour, faith, and unconditional welcome in the kitchen", musicKey: "G Major" },
      { id: "gm-02", title: "Sugar in the Sunday", genre: "Sweet Pop-Soul", mood: "Playful Love", customIdeas: "Grandma makes ordinary Sundays feel special", musicKey: "Bb Major" },
      { id: "gm-03", title: "Letters Tied With Ribbon", genre: "Piano Ballad", mood: "Legacy & Memory", customIdeas: "Keepsake box of family letters and ribbons", musicKey: "D Major" },
      { id: "gm-04", title: "Her Garden Still Grows", genre: "Organic Folk", mood: "Hopeful Nature", customIdeas: "Grandma plants hope season after season", musicKey: "A Major" },
      { id: "gm-05", title: "The Softest Strong", genre: "Soul Ballad", mood: "Quiet Power", customIdeas: "Strength that is kind, steady, and immovable", musicKey: "Eb Major" },
      { id: "gm-06", title: "Buttons and Blessings", genre: "Country Pop", mood: "Cheerful Character", customIdeas: "Sewing tin, mending, and everyday blessings", musicKey: "C Major" },
      { id: "gm-07", title: "A Hymn in Every Room", genre: "Chamber Folk", mood: "Peaceful Faith", customIdeas: "Peace follows Grandma through every room", musicKey: "F Major" },
      { id: "gm-08", title: "Grandma's Radio", genre: "Retro Soul", mood: "Nostalgic Joy", customIdeas: "Oldies on the kitchen radio and dancing", musicKey: "A Major" },
      { id: "gm-09", title: "Love That Never Hurries", genre: "Acoustic Ballad", mood: "Patient Love", customIdeas: "Unhurried healing love without conditions", musicKey: "C Major" },
      { id: "gm-10", title: "Candles for the Queen of Us", genre: "Family Anthem Pop", mood: "Grand Finale", customIdeas: "Singalong birthday anthem for Grandma", musicKey: "G Major" },
    ],
  },
  {
    id: "album-birthday-mum",
    name: "Mum's Birthday — You're the Song",
    occasion: "Birthday Celebration — Mum",
    comments:
      "Family birthday album for Mum: phone calls, midnight care, kitchen light, parade, thank-you.",
    genres: ["Pop Ballad", "Modern Pop", "Indie Pop", "Soul Ballad"],
    tracks: [
      { id: "mu-01", title: "Mum, You're the Song", genre: "Pop Ballad", mood: "Opening Love Letter", customIdeas: "Mum is the melody the whole family learned by heart", musicKey: "C Major" },
      { id: "mu-02", title: "Phone Call Home", genre: "Modern Pop", mood: "Everyday Devotion", customIdeas: "Calling Mum always feels like rescue", musicKey: "A Major" },
      { id: "mu-03", title: "The Way You Say My Name", genre: "Emotional Pop", mood: "Intimate Recognition", customIdeas: "Mum's pronunciation settles the nervous system", musicKey: "D Major" },
      { id: "mu-04", title: "Midnight Mum", genre: "Indie Pop", mood: "Night-Shift Love", customIdeas: "Mum stayed up worrying, folding, loving at 2am", musicKey: "E Minor" },
      { id: "mu-05", title: "Her Hands, My Harbor", genre: "R&B Ballad", mood: "Physical Memory", customIdeas: "Mum's hands as a safe harbor through life", musicKey: "Bb Major" },
      { id: "mu-06", title: "What You Made of Me", genre: "Empowerment Pop", mood: "Pride & Inheritance", customIdeas: "Character and courage Mum built into us", musicKey: "G Major" },
      { id: "mu-07", title: "Kitchen Light Love", genre: "Acoustic Pop", mood: "Domestic Poetry", customIdeas: "Ordinary kitchen moments of visible love", musicKey: "F Major" },
      { id: "mu-08", title: "Still Your Child", genre: "Soul Ballad", mood: "Adult-to-Parent Truth", customIdeas: "No matter how grown, we are still Mum's child", musicKey: "Eb Major" },
      { id: "mu-09", title: "Mum's Birthday Parade", genre: "Celebration Pop", mood: "Playful Party", customIdeas: "Upbeat party parade in Mum's honor", musicKey: "D Major" },
      { id: "mu-10", title: "Thank You, Mum", genre: "Gratitude Ballad", mood: "Closing Thanks", customIdeas: "Simple complete thank-you closing the album", musicKey: "C Major" },
    ],
  },
  {
    id: "album-birthday-dad",
    name: "Dad's Birthday — Hold the Mic",
    occasion: "Birthday Celebration — Dad",
    comments:
      "Family birthday album for Dad: workshop rock, road trips, dad jokes, garage lessons, anthem finale.",
    genres: ["Celebration Rock-Pop", "Heartland Ballad", "Workshop Rock", "Family Anthem"],
    tracks: [
      { id: "da-01", title: "Dad, Hold the Mic", genre: "Celebration Rock-Pop", mood: "Birthday Opener", customIdeas: "Hand Dad the mic for his birthday", musicKey: "A Major" },
      { id: "da-02", title: "His Quiet Strength", genre: "Heartland Ballad", mood: "Steady Presence", customIdeas: "Dad's quiet steady strength over performance", musicKey: "G Major" },
      { id: "da-03", title: "Fix-It Heart", genre: "Workshop Rock", mood: "Hands-On Love", customIdeas: "Love expressed through repair and tools", musicKey: "E Major" },
      { id: "da-04", title: "Dad Jokes & Dance Moves", genre: "Fun Pop", mood: "Humor & Heart", customIdeas: "Legendary jokes and committed dance moves", musicKey: "C Major" },
      { id: "da-05", title: "Road Trips With Dad", genre: "Open-Road Rock", mood: "Adventure & Bonding", customIdeas: "Car trips, playlists, life talks with Dad", musicKey: "D Major" },
      { id: "da-06", title: "The Man Behind the Wheel", genre: "Reflective Rock", mood: "Provider Tribute", customIdeas: "Dad as driver and unseen provider", musicKey: "B Minor" },
      { id: "da-07", title: "Beard & Bear Hugs", genre: "Fun Country", mood: "Affectionate Character", customIdeas: "Cozy toughness and enormous bear hugs", musicKey: "G Major" },
      { id: "da-08", title: "Lessons in the Garage", genre: "Story Rock", mood: "Mentorship Memory", customIdeas: "Garage school of tools patience and character", musicKey: "A Minor" },
      { id: "da-09", title: "Strong Enough to Soften", genre: "Soul Rock", mood: "Emotional Growth", customIdeas: "Real strength includes softness and apology", musicKey: "E Major" },
      { id: "da-10", title: "Happy Birthday, Dad", genre: "Family Anthem", mood: "Grand Finale", customIdeas: "Full-family birthday anthem finale", musicKey: "G Major" },
    ],
  },
];

function main() {
  mkdirSync(ALBUMS_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const generatedAlbums = ALBUMS.map((alb) => {
    console.log(`\n=== Generating album via LyricsForge pipeline: ${alb.name} ===`);
    const songs = alb.tracks.map((t, i) => {
      const promptArgs = {
        albumName: alb.name,
        occasion: alb.occasion,
        comments: alb.comments,
        title: t.title,
        genre: t.genre,
        mood: t.mood,
        customIdeas: t.customIdeas,
        structure: t.structure || "Verse - Chorus - Verse - Chorus - Bridge - Chorus",
        rhymeScheme: t.rhymeScheme || "ABAB (Alternate Rhyme)",
        language: "English",
      };
      const result = generateViaAppPipeline(promptArgs);
      console.log(
        `  ${String(i + 1).padStart(2, "0")}. ${t.title} — ${result.lyricVersions.length} versions (${result.lyricVersions.map((v) => v.length).join("/")} lines) · ${result.mode}`
      );
      return {
        id: `${t.id}-${alb.id.replace("album-birthday-", "")}`,
        title: t.title,
        genre: t.genre,
        mood: t.mood,
        structure: promptArgs.structure,
        rhymeScheme: promptArgs.rhymeScheme,
        customIdeas: t.customIdeas,
        lyrics: result.lyricVersions,
        activeLyricVersion: 0,
        isApproved: true,
        language: "en",
        musicKey: t.musicKey || "C Major",
        tags: ["birthday", "in-app-generation", "3-versions", alb.id],
        titleRationale: `Generated through LyricsForge Album Studio pipeline for ${alb.occasion}.`,
        artistStyleName: "LyricsForge Album Studio",
      };
    });

    return {
      id: alb.id,
      name: alb.name,
      occasion: alb.occasion,
      comments: alb.comments,
      genres: alb.genres,
      songCount: songs.length,
      language: "English",
      titlesReadyForReview: false,
      songs,
    };
  });

  // Per-album JSON + text package
  const fileSlugs: Record<string, string> = {
    "album-birthday-grandpa": "grandpa-birthday-album",
    "album-birthday-grandma": "grandma-birthday-album",
    "album-birthday-mum": "mum-birthday-album",
    "album-birthday-dad": "dad-birthday-album",
  };

  for (const alb of generatedAlbums) {
    const slug = fileSlugs[alb.id] || alb.id;
    const jsonPath = join(ALBUMS_DIR, `${slug}.json`);
    writeFileSync(jsonPath, JSON.stringify(alb, null, 2) + "\n", "utf-8");
    const totalVersions = alb.songs.reduce((n, s) => n + (s.lyrics?.length || 0), 0);
    console.log(`Wrote ${slug}.json — ${alb.songs.length} songs, ${totalVersions} lyric versions`);

    let txt = `${"=".repeat(72)}\nALBUM (IN-APP GENERATION): ${alb.name}\nOccasion: ${alb.occasion}\nTracks: ${alb.songs.length} × 3 versions\nPipeline: LyricsForge Album Studio (3-version engine)\n${"=".repeat(72)}\n\n`;
    alb.songs.forEach((s, idx) => {
      txt += `${"-".repeat(72)}\nTRACK ${idx + 1}: ${s.title}\nGenre: ${s.genre} | Mood: ${s.mood} | Key: ${s.musicKey}\n${"-".repeat(72)}\n\n`;
      (s.lyrics as unknown as string[][]).forEach((ver, vi) => {
        txt += `--- Version ${vi + 1} ---\n${ver.join("\n")}\n\n`;
      });
    });
    writeFileSync(join(ALBUMS_DIR, `${slug}.txt`), txt + "\n", "utf-8");
  }

  // Combined library import (albums + flat singles with all versions)
  const flatSongs = generatedAlbums.flatMap((alb) =>
    alb.songs.map((s) => ({
      ...s,
      tags: [...(s.tags || []), "birthday-collection", alb.id],
      customIdeas: `${s.customIdeas} · From album: ${alb.name}`,
    }))
  );
  const library = {
    albums: generatedAlbums,
    songs: flatSongs,
    meta: {
      name: "Family Birthday Album Collection — In-App 3-Version Generation",
      description:
        "Four 10-song birthday albums generated through LyricsForge Album Studio pipeline. Every track has 3 lyric versions for Song Version Studio editing.",
      songCountTotal: generatedAlbums.reduce((n, a) => n + a.songs.length, 0),
      lyricVersionCountTotal: flatSongs.reduce((n, s) => n + (s.lyrics?.length || 0), 0),
      generatedBy: "scripts/run_inapp_album_generation.ts · LyricsForge 3-version engine",
      generatedAt: new Date().toISOString(),
    },
  };
  writeFileSync(
    join(ALBUMS_DIR, "birthday-albums-library-import-full.json"),
    JSON.stringify(library, null, 2) + "\n",
    "utf-8"
  );
  writeFileSync(
    join(ALBUMS_DIR, "birthday-albums-library-import.json"),
    JSON.stringify({ albums: generatedAlbums, songs: [], meta: library.meta }, null, 2) + "\n",
    "utf-8"
  );
  console.log(
    `\nLibrary import: ${library.meta.songCountTotal} songs · ${library.meta.lyricVersionCountTotal} lyric versions`
  );

  // TypeScript seed for Production Library
  const tsLines: string[] = [
    "// Auto-generated — family birthday albums via LyricsForge Album Studio (3 versions / song).",
    'import type { Album } from "../types";',
    "",
    "export const BIRTHDAY_ALBUMS: Album[] = [",
  ];
  for (const alb of generatedAlbums) {
    tsLines.push("  {");
    tsLines.push(`    id: ${JSON.stringify(alb.id)},`);
    tsLines.push(`    name: ${JSON.stringify(alb.name)},`);
    tsLines.push(`    occasion: ${JSON.stringify(alb.occasion)},`);
    tsLines.push(`    comments: ${JSON.stringify(alb.comments)},`);
    tsLines.push(`    genres: ${JSON.stringify(alb.genres)},`);
    tsLines.push(`    songCount: ${alb.songCount},`);
    tsLines.push(`    language: "English",`);
    tsLines.push("    titlesReadyForReview: false,");
    tsLines.push("    songs: [");
    for (const s of alb.songs) {
      tsLines.push("      {");
      tsLines.push(`        id: ${JSON.stringify(s.id)},`);
      tsLines.push(`        title: ${JSON.stringify(s.title)},`);
      tsLines.push(`        genre: ${JSON.stringify(s.genre)},`);
      tsLines.push(`        mood: ${JSON.stringify(s.mood)},`);
      tsLines.push(`        structure: ${JSON.stringify(s.structure)},`);
      tsLines.push(`        rhymeScheme: ${JSON.stringify(s.rhymeScheme)},`);
      tsLines.push(`        customIdeas: ${JSON.stringify(s.customIdeas)},`);
      tsLines.push(`        isApproved: true,`);
      tsLines.push(`        language: "en",`);
      tsLines.push(`        musicKey: ${JSON.stringify(s.musicKey)},`);
      tsLines.push(`        activeLyricVersion: 0,`);
      tsLines.push(`        titleRationale: ${JSON.stringify(s.titleRationale)},`);
      tsLines.push(`        artistStyleName: ${JSON.stringify(s.artistStyleName)},`);
      tsLines.push(`        tags: ${JSON.stringify(s.tags)},`);
      tsLines.push("        lyrics: [");
      for (const ver of s.lyrics as string[][]) {
        tsLines.push("          [");
        for (const line of ver) {
          tsLines.push(`            ${JSON.stringify(line)},`);
        }
        tsLines.push("          ],");
      }
      tsLines.push("        ],");
      tsLines.push("      },");
    }
    tsLines.push("    ],");
    tsLines.push("  },");
  }
  tsLines.push("];");
  tsLines.push("");
  tsLines.push("export default BIRTHDAY_ALBUMS;");
  tsLines.push("");
  writeFileSync(join(DATA_DIR, "birthdayAlbums.ts"), tsLines.join("\n"), "utf-8");
  console.log("Wrote src/data/birthdayAlbums.ts");

  // Combined readable package
  let combined = "FAMILY BIRTHDAY ALBUMS — IN-APP 3-VERSION GENERATION\nLyricsForge Album Studio pipeline\n\n";
  for (const alb of generatedAlbums) {
    combined += `${"=".repeat(72)}\n${alb.name}\n${alb.occasion}\n${"=".repeat(72)}\n\n`;
    alb.songs.forEach((s, idx) => {
      combined += `TRACK ${idx + 1}: ${s.title}\n`;
      (s.lyrics as unknown as string[][]).forEach((ver, vi) => {
        combined += `\n[V${vi + 1}]\n${ver.join("\n")}\n`;
      });
      combined += "\n";
    });
  }
  writeFileSync(join(ALBUMS_DIR, "all-birthday-albums-complete.txt"), combined, "utf-8");
  console.log("Wrote albums/all-birthday-albums-complete.txt");

  // Validate
  for (const alb of generatedAlbums) {
    if (alb.songs.length !== 10) throw new Error(`${alb.name} expected 10 songs`);
    for (const s of alb.songs) {
      if (!s.lyrics || s.lyrics.length !== 3) {
        throw new Error(`${s.title} expected 3 lyric versions, got ${s.lyrics?.length}`);
      }
    }
  }
  console.log("\nValidation OK: 4 albums × 10 songs × 3 versions = 120 lyric drafts.");
}

main();
