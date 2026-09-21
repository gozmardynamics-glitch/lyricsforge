/**
 * Offline runner that executes LyricsForge's Album Studio 3-version pipeline
 * for the four family birthday albums (40 tracks × 3 lyric versions).
 *
 * Bundled with esbuild and executed by Node — uses the SAME generation modules
 * as the app UI (generateThreeLyricVersions / procedural fallback).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generateThreeLyricVersions } from "../src/agents/generateThreeLyricVersions";

const ROOT = process.cwd();
const ALBUMS_DIR = join(ROOT, "albums");
mkdirSync(ALBUMS_DIR, { recursive: true });

interface TrackMeta {
  id: string;
  title: string;
  genre: string;
  mood: string;
  customIdeas: string;
  structure?: string;
  rhymeScheme?: string;
  musicKey?: string;
}

interface AlbumMeta {
  id: string;
  name: string;
  occasion: string;
  comments: string;
  genres: string[];
  tracks: TrackMeta[];
}

const ALBUMS: AlbumMeta[] = [
  {
    id: "album-birthday-grandpa",
    name: "Grandpa's Birthday — Another Candle Light",
    occasion: "Birthday Celebration — Grandpa",
    comments:
      "Family birthday album for Grandpa: porch light, wisdom, hands that built the house, open gate, singalong toast.",
    genres: ["Country Folk", "Classic Country", "Acoustic Ballad", "Jazz Swing", "Gospel Soul"],
    tracks: [
      { id: "gp-01", title: "Another Candle Light", genre: "Country Folk", mood: "Warm Gratitude", customIdeas: "Birthday candles, kitchen table, quiet pride in another year with Grandpa", musicKey: "G Major" },
      { id: "gp-02", title: "Grandpa's Porch Light", genre: "Classic Country", mood: "Nostalgic Comfort", customIdeas: "Always welcome at Grandpa's porch light; home for anyone lost", musicKey: "D Major" },
      { id: "gp-03", title: "Stories in Your Hands", genre: "Acoustic Ballad", mood: "Tender Tribute", customIdeas: "Grandpa's hands tell stories of work, care, and love", musicKey: "A Major" },
      { id: "gp-04", title: "The Chair That Knows You", genre: "Americana Blues", mood: "Quiet Devotion", customIdeas: "Grandpa's favorite chair holds a lifetime of ordinary holy moments", musicKey: "E Minor" },
      { id: "gp-05", title: "Wisdom Like Wine", genre: "Jazz Swing", mood: "Playful Respect", customIdeas: "Swinging celebration of Grandpa's wit, timing, and seasoned advice", musicKey: "Bb Major" },
      { id: "gp-06", title: "Hands That Built the House", genre: "Heartland Rock", mood: "Grateful Strength", customIdeas: "Grandpa as builder and foundation of the family home", musicKey: "E Major" },
      { id: "gp-07", title: "Sunday With Grandpa", genre: "Gospel Soul", mood: "Sacred Family", customIdeas: "Sunday morning hymns, biscuits, grace, Grandpa's quiet faith", musicKey: "F Major" },
      { id: "gp-08", title: "Silver and Smoke", genre: "Classic Crooner", mood: "Elegant Toast", customIdeas: "Classy birthday toast; Grandpa as silver-and-smoke gentleman", musicKey: "F# Major" },
      { id: "gp-09", title: "Keep the Gate Unlatched", genre: "Folk Anthem", mood: "Open Heart", customIdeas: "Grandpa never locks the garden gate; always open, always home", musicKey: "C Major" },
      { id: "gp-10", title: "Raise a Glass to Grandpa", genre: "Celebration Pop-Folk", mood: "Joyful Closer", customIdeas: "Full-family singalong birthday toast and parade for Grandpa", musicKey: "D Major" },
    ],
  },
  {
    id: "album-birthday-grandma",
    name: "Grandma's Birthday — Candles for the Queen of Us",
    occasion: "Birthday Celebration — Grandma",
    comments:
      "Family birthday album for Grandma: kitchen hymns, garden seasons, soft strength, radio soul, candlelit finale.",
    genres: ["Folk Gospel", "Sweet Pop-Soul", "Piano Ballad", "Organic Folk", "Retro Soul"],
    tracks: [
      { id: "gm-01", title: "Grandma's Kitchen Hymn", genre: "Folk Gospel", mood: "Gentle Devotion", customIdeas: "Flour, faith, supper-as-prayer in Grandma's kitchen", musicKey: "G Major" },
      { id: "gm-02", title: "Sugar in the Sunday", genre: "Sweet Pop-Soul", mood: "Playful Love", customIdeas: "Grandma makes ordinary Sundays feel special and sweet", musicKey: "Bb Major" },
      { id: "gm-03", title: "Letters Tied With Ribbon", genre: "Piano Ballad", mood: "Legacy & Memory", customIdeas: "Keepsakes, old letters, Grandma preserves family history", musicKey: "D Major" },
      { id: "gm-04", title: "Her Garden Still Grows", genre: "Organic Folk", mood: "Hopeful Nature", customIdeas: "Grandma as gardener — patience, seasons, love that keeps blooming", musicKey: "A Major" },
      { id: "gm-05", title: "The Softest Strong", genre: "Soul Ballad", mood: "Quiet Power", customIdeas: "Grandma's strength is soft, immovable, and kind", musicKey: "Eb Major" },
      { id: "gm-06", title: "Buttons and Blessings", genre: "Country Pop", mood: "Cheerful Character", customIdeas: "Grandma sewing, fixing, blessing everything in sight", musicKey: "C Major" },
      { id: "gm-07", title: "A Hymn in Every Room", genre: "Chamber Folk", mood: "Peaceful Faith", customIdeas: "Peace fills every room Grandma moves through", musicKey: "F Major" },
      { id: "gm-08", title: "Grandma's Radio", genre: "Retro Soul", mood: "Nostalgic Joy", customIdeas: "Oldies radio, kitchen dancing, Grandma's joyful music taste", musicKey: "A Major" },
      { id: "gm-09", title: "Love That Never Hurries", genre: "Acoustic Ballad", mood: "Patient Love", customIdeas: "Unhurried, healing kind of love only Grandma gives", musicKey: "C Major" },
      { id: "gm-10", title: "Candles for the Queen of Us", genre: "Family Anthem Pop", mood: "Grand Finale", customIdeas: "Candlelit family birthday anthem for the queen of the family", musicKey: "G Major" },
    ],
  },
  {
    id: "album-birthday-mum",
    name: "Mum's Birthday — You're the Song",
    occasion: "Birthday Celebration — Mum",
    comments:
      "Family birthday album for Mum: phone-call pop, midnight devotion, kitchen light poetry, parade energy, thank-you finale.",
    genres: ["Pop Ballad", "Modern Pop", "Emotional Pop", "Indie Pop", "R&B Ballad"],
    tracks: [
      { id: "mu-01", title: "Mum, You're the Song", genre: "Pop Ballad", mood: "Opening Love Letter", customIdeas: "Mum is the melody the whole family learned by heart", musicKey: "C Major" },
      { id: "mu-02", title: "Phone Call Home", genre: "Modern Pop", mood: "Everyday Devotion", customIdeas: "Calling Mum — she always answers; ordinary miracle of home", musicKey: "A Major" },
      { id: "mu-03", title: "The Way You Say My Name", genre: "Emotional Pop", mood: "Intimate Recognition", customIdeas: "How Mum's voice saying our name settles the nervous system", musicKey: "D Major" },
      { id: "mu-04", title: "Midnight Mum", genre: "Indie Pop", mood: "Night-Shift Love", customIdeas: "Mum who stayed up — worries, laundry, love at 2 a.m.", musicKey: "E Minor" },
      { id: "mu-05", title: "Her Hands, My Harbor", genre: "R&B Ballad", mood: "Physical Memory", customIdeas: "Mum's hands — cooking, comforting, carrying — as safe harbor", musicKey: "Bb Major" },
      { id: "mu-06", title: "What You Made of Me", genre: "Empowerment Pop", mood: "Pride & Inheritance", customIdeas: "Character and courage Mum built into us; gratitude for design", musicKey: "G Major" },
      { id: "mu-07", title: "Kitchen Light Love", genre: "Acoustic Pop", mood: "Domestic Poetry", customIdeas: "Ordinary kitchen moments where Mum's love was most visible", musicKey: "F Major" },
      { id: "mu-08", title: "Still Your Child", genre: "Soul Ballad", mood: "Adult-to-Parent Truth", customIdeas: "No matter how grown, we're still Mum's child", musicKey: "Eb Major" },
      { id: "mu-09", title: "Mum's Birthday Parade", genre: "Celebration Pop", mood: "Playful Party", customIdeas: "Upbeat party parade in Mum's honor — balloons, cake, dance", musicKey: "D Major" },
      { id: "mu-10", title: "Thank You, Mum", genre: "Gratitude Ballad", mood: "Closing Thanks", customIdeas: "Simple complete thank-you to Mum; album closer", musicKey: "C Major" },
    ],
  },
  {
    id: "album-birthday-dad",
    name: "Dad's Birthday — Hold the Mic",
    occasion: "Birthday Celebration — Dad",
    comments:
      "Family birthday album for Dad: workshop rock, open-road memories, dad jokes, quiet strength, garage lessons, anthem finale.",
    genres: ["Celebration Rock-Pop", "Heartland Ballad", "Workshop Rock", "Open-Road Rock", "Family Anthem"],
    tracks: [
      { id: "da-01", title: "Dad, Hold the Mic", genre: "Celebration Rock-Pop", mood: "Birthday Opener", customIdeas: "Hand Dad the mic for his birthday; he'll tell a story from '84", musicKey: "A Major" },
      { id: "da-02", title: "His Quiet Strength", genre: "Heartland Ballad", mood: "Steady Presence", customIdeas: "Dad's quiet, steady strength — presence over performance", musicKey: "G Major" },
      { id: "da-03", title: "Fix-It Heart", genre: "Workshop Rock", mood: "Hands-On Love", customIdeas: "Dad as fixer — tools, patience, love expressed through repair", musicKey: "E Major" },
      { id: "da-04", title: "Dad Jokes & Dance Moves", genre: "Fun Pop", mood: "Humor & Heart", customIdeas: "Legendary dad jokes and unexpectedly committed dance moves", musicKey: "C Major" },
      { id: "da-05", title: "Road Trips With Dad", genre: "Open-Road Rock", mood: "Adventure & Bonding", customIdeas: "Car trips, playlists, life talks with Dad on the open road", musicKey: "D Major" },
      { id: "da-06", title: "The Man Behind the Wheel", genre: "Reflective Rock", mood: "Provider Tribute", customIdeas: "Dad as driver, provider, unseen person keeping life on course", musicKey: "B Minor" },
      { id: "da-07", title: "Beard & Bear Hugs", genre: "Fun Country", mood: "Affectionate Character", customIdeas: "Dad's hugs, cozy toughness, bear-like presence", musicKey: "G Major" },
      { id: "da-08", title: "Lessons in the Garage", genre: "Story Rock", mood: "Mentorship Memory", customIdeas: "Garage school: tools, trial, patience; Dad teaching life", musicKey: "A Minor" },
      { id: "da-09", title: "Strong Enough to Soften", genre: "Soul Rock", mood: "Emotional Growth", customIdeas: "Real strength includes softness; Dad learning and teaching that", musicKey: "E Major" },
      { id: "da-10", title: "Happy Birthday, Dad", genre: "Family Anthem", mood: "Grand Finale", customIdeas: "Full-family birthday wish anthem for Dad; album closer", musicKey: "G Major" },
    ],
  },
];

async function main() {
  const report: any[] = [];
  const allAlbums: any[] = [];

  for (const album of ALBUMS) {
    console.log(`\n=== Generating album: ${album.name} ===`);
    const songs: any[] = [];
    for (const track of album.tracks) {
      process.stdout.write(`  • ${track.title} ... `);
      const result = await generateThreeLyricVersions({
        title: track.title,
        genre: track.genre,
        mood: track.mood,
        albumName: album.name,
        occasion: album.occasion,
        albumComments: album.comments,
        customIdeas: track.customIdeas,
        structure: "Verse - Chorus - Verse - Chorus - Bridge - Chorus - Outro",
        rhymeScheme: "ABAB (Alternate Rhyme)",
        language: "en",
      }, "English");

      const versions = result.versions.slice(0, 3);
      while (versions.length < 3) versions.push([...(versions[0] || ["[Verse 1]", "Pending"])]);

      songs.push({
        id: track.id,
        title: track.title,
        genre: track.genre,
        mood: track.mood,
        structure: "Verse - Chorus - Verse - Chorus - Bridge - Chorus - Outro",
        rhymeScheme: "ABAB (Alternate Rhyme)",
        customIdeas: track.customIdeas,
        lyrics: versions,
        activeLyricVersion: 0,
        isApproved: true,
        language: "English",
        musicKey: track.musicKey || "C Major",
        tags: ["birthday", "family", "app-generated", album.id],
        titleRationale: `Generated through LyricsForge Album Studio pipeline for ${album.occasion}.`,
        artistStyleName: "LyricsForge Studio Pipeline",
        referenceSongTitle: "",
        generationMeta: {
          usedFallback: result.usedFallback,
          fallbackReason: result.fallbackReason || null,
          modelId: result.modelId,
          versionCount: versions.length,
        },
      });
      const lineCounts = versions.map((v) => v.length).join("/");
      console.log(`${versions.length} versions (${lineCounts} lines)${result.usedFallback ? " [procedural/fallback]" : " [live]"}`);
      report.push({
        album: album.name,
        track: track.title,
        versions: versions.length,
        lineCounts: versions.map((v) => v.length),
        usedFallback: result.usedFallback,
        fallbackReason: result.fallbackReason || null,
      });
    }

    const albumObj = {
      id: album.id,
      name: album.name,
      occasion: album.occasion,
      comments: album.comments,
      genres: album.genres,
      songCount: songs.length,
      songs,
      language: "English",
      titlesReadyForReview: false,
      generatedVia: "lyricsforge-album-studio-pipeline",
      generatedAt: Date.now(),
    };
    allAlbums.push(albumObj);

    const fname = album.id.replace("album-birthday-", "") + "-birthday-album.json";
    writeFileSync(join(ALBUMS_DIR, fname), JSON.stringify(albumObj, null, 2) + "\n", "utf-8");
    console.log(`  wrote albums/${fname}`);
  }

  const flatSongs = allAlbums.flatMap((a) =>
    a.songs.map((s: any) => ({
      ...s,
      tags: [...new Set([...(s.tags || []), "birthday-collection", a.id])],
      customIdeas: `${s.customIdeas} · From album: ${a.name}`,
    }))
  );

  writeFileSync(
    join(ALBUMS_DIR, "birthday-albums-library-import.json"),
    JSON.stringify({ albums: allAlbums, songs: [], meta: { generatedVia: "lyricsforge-app-pipeline", songCountTotal: 40 } }, null, 2) + "\n",
    "utf-8"
  );
  writeFileSync(
    join(ALBUMS_DIR, "birthday-albums-library-import-full.json"),
    JSON.stringify({ albums: allAlbums, songs: flatSongs, meta: { generatedVia: "lyricsforge-app-pipeline", songCountTotal: 40 } }, null, 2) + "\n",
    "utf-8"
  );
  writeFileSync(
    join(ALBUMS_DIR, "generation-run-report.json"),
    JSON.stringify({ generatedAt: Date.now(), pipeline: "generateThreeLyricVersions", tracks: report.length, report }, null, 2) + "\n",
    "utf-8"
  );

  // TypeScript seed for in-app Production Library
  const albumForTs = allAlbums.map((a) => ({
    id: a.id,
    name: a.name,
    occasion: a.occasion,
    comments: a.comments,
    genres: a.genres,
    songCount: a.songCount,
    language: a.language,
    titlesReadyForReview: false,
    songs: a.songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      genre: s.genre,
      mood: s.mood,
      structure: s.structure,
      rhymeScheme: s.rhymeScheme,
      customIdeas: s.customIdeas,
      lyrics: s.lyrics,
      activeLyricVersion: 0,
      isApproved: s.isApproved,
      language: s.language,
      musicKey: s.musicKey,
      tags: s.tags,
      titleRationale: s.titleRationale,
      artistStyleName: s.artistStyleName,
      referenceSongTitle: s.referenceSongTitle,
    })),
  }));
  const tsLines: string[] = [
    "// Auto-generated via LyricsForge Album Studio pipeline (3 versions per song).",
    "import type { Album } from \"../types\";",
    "",
    "export const BIRTHDAY_ALBUMS: Album[] = " + JSON.stringify(albumForTs, null, 2) + ";",
    "",
    "export default BIRTHDAY_ALBUMS;",
    "",
  ];
  writeFileSync(join(ROOT, "src", "data", "birthdayAlbums.ts"), tsLines.join("\n"), "utf-8");

  const fallbackCount = report.filter((r) => r.usedFallback).length;
  console.log(`\nDone. ${report.length} tracks × 3 versions.`);
  console.log(`Fallback/procedural: ${fallbackCount}/${report.length}`);
  console.log(`Files written under albums/ + src/data/birthdayAlbums.ts`);
}

main().catch((err) => {
  console.error("Generation runner failed:", err);
  process.exit(1);
});
