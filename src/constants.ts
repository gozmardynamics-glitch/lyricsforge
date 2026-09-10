import { StylePreset } from "./types";

export interface OccasionCategory {
  category: string;
  icon: string;
  occasions: string[];
}

export const OCCASIONS_CATEGORIZED: OccasionCategory[] = [
  {
    category: "Milestones & Celebrations",
    icon: "🎉",
    occasions: [
      "Birthday Celebration",
      "Wedding & Nuptials",
      "Anniversary & Golden Years",
      "Graduation & New Beginnings",
      "Retirement & Next Chapter",
      "Birth / Baby Shower Celebration",
      "Victory & Championship"
    ]
  },
  {
    category: "Romance & Relationships",
    icon: "💖",
    occasions: [
      "Romantic Serenade & Passion",
      "Valentine's Day Devotion",
      "Marriage Proposal & Forever Promise",
      "First Date & Electric Sparks",
      "Long Distance Yearning",
      "Unconditional Love & Soulmates"
    ]
  },
  {
    category: "Heartbreak, Grief & Healing",
    icon: "💔",
    occasions: [
      "Breakup, Regret & Cold Goodbyes",
      "Loss of a Loved One (Memorial Tribute)",
      "Unrequited & Secret Love",
      "Healing, Closure & Moving On",
      "Betrayal & Bitter Truths",
      "Late Night Nostalgia & What-Ifs"
    ]
  },
  {
    category: "Seasonal & Holiday Festivities",
    icon: "🎄",
    occasions: [
      "Christmas & Winter Holidays",
      "Summertime Vibes & Beach Days",
      "New Year's Eve & Fresh Starts",
      "Halloween & Midnight Mystery",
      "Autumn Rain & Cozy Solitude",
      "Spring Renewal & Blossom"
    ]
  },
  {
    category: "Nightlife, Energy & Anthems",
    icon: "🔥",
    occasions: [
      "Club Banger & Weekend Night Out",
      "Festival Euphoria & Mainstage Anthem",
      "Workout Motivation & Gym Hype",
      "Late Night Road Trip & City Cruising",
      "Underdog Hustle & Ambition",
      "Rebellion & Freedom"
    ]
  },
  {
    category: "Introspective, Spiritual & Custom",
    icon: "✨",
    occasions: [
      "Personal Reflection & Growth",
      "Spiritual Faith & Gospel Praise",
      "Existential Wonder & Midnight Thoughts",
      "Gratitude & Life Journey",
      "Custom Occasion"
    ]
  }
];

// Flat list for simple selector compatibility
export const OCCASIONS: string[] = OCCASIONS_CATEGORIZED.flatMap(c => c.occasions);

export const GENRES = [
  "Pop", "Rock", "Rap", "Hip Hop", "R&B", "Trap", "Country", "Jazz", 
  "Electronic / EDM", "Synthwave", "Afrobeats", "Latin / Reggaeton", "K-Pop", 
  "Folk & Americana", "Blues", "Soul & Motown", "Classical & Orchestral", 
  "Reggae & Dancehall", "Heavy Metal", "Acoustic / Singer-Songwriter", 
  "Lo-Fi & Chillhop", "Indie Rock", "Punk & Alt-Rock", "Disco & Funk", "Gospel & Contemporary Christian"
];

export const RHYME_SCHEMES = [
  "AABB (Couplets)",
  "ABAB (Alternate Rhyme)",
  "ABCB (Ballad Stanza)",
  "AAAA (Monorhyme)",
  "AABBA (Limerick / Quintet)",
  "Free Verse / Dynamic"
];

export const EMOTIONAL_MOODS = [
  "Melancholic & Reflective",
  "Energetic & Hype",
  "Angry & Aggressive",
  "Hopeful & Uplifting",
  "Bittersweet & Nostalgic",
  "Euphoric & Festival Vibe",
  "Romantic & Passionate",
  "Dark & Gritty",
  "Inspiring & Cinematic",
  "Sarcastic & Witty",
  "Dreamy & Ethereal",
  "Sensual & Intimate",
  "Triumphant & Victorious",
  "Custom Mood..."
];

export const DEFAULT_STYLE_PRESETS: StylePreset[] = [
  {
    id: "preset-pop-storyteller",
    name: "Billboard Pop Storyteller (Taylor Swift Style)",
    artistReference: "Taylor Swift / Pop Hitmakers",
    description: "Vivid conversational storytelling, hyper-specific sensory details, emotional bridge build-ups, and infectious internal rhyme schemes.",
    cadenceAndMeter: "Conversational, syncopated rhythm with building tension into explosive choruses.",
    rhymeDensity: "High internal rhymes, slant rhymes, ABAB verse structures.",
    vocabularyStyle: "Intimate, relatable, cinematic imagery."
  },
  {
    id: "preset-melodic-trap",
    name: "Melodic Trap & Cadence (Drake / Travis Scott Vibe)",
    artistReference: "Drake / Travis Scott / Post Malone",
    description: "Atmospheric flex, dark night-drive mood, rhythmic triplet flow switches, melodic hooks, and introspective flexes.",
    cadenceAndMeter: "Triplet bounce, heavy emphasis on end-rhymes with ambient reverb pauses.",
    rhymeDensity: "AABB couplets with repetitive chant hooks.",
    vocabularyStyle: "Street luxury, nocturnal metaphors, late-night reflections."
  },
  {
    id: "preset-anthemic-rock",
    name: "Anthemic Stadium Rock (Imagine Dragons / Coldplay)",
    artistReference: "Coldplay / Imagine Dragons / Foo Fighters",
    description: "Huge vocal chants, thunderous stadium-filling metaphors, raw emotional vulnerability, and high-energy catharsis.",
    cadenceAndMeter: "Driving 4/4 rhythm with powerful crescendo choruses.",
    rhymeDensity: "AABB / ABCB with rhythmic repetition.",
    vocabularyStyle: "Elemental imagery (fire, storm, stone, sky), empowering themes."
  },
  {
    id: "preset-poetic-indie",
    name: "Poetic Indie Folk (Hozier / Phoebe Bridgers)",
    artistReference: "Hozier / Phoebe Bridgers / Bon Iver",
    description: "Lush literary metaphors, dark romantic mythology, haunting acoustic cadence, and subtle wordplay.",
    cadenceAndMeter: "Fluid, flexible meter with poetic pauses and intricate phrasing.",
    rhymeDensity: "Complex slant rhymes, assonance, and free-flowing verse structures.",
    vocabularyStyle: "Literary, botanical, gothic romantic, deeply introspective."
  }
];
