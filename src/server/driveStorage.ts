/**
 * Google Drive primary storage for LyricsForge.
 * Uses Google Drive for Desktop mount when available (Windows: G:\My Drive, etc.)
 * so library exports sync to the user's Google cloud account automatically.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface DriveStorageStatus {
  available: boolean;
  rootPath: string | null;
  libraryRoot: string | null;
  source: "env" | "windows-mount" | "unix-mount" | "none";
  lastSyncAt: number | null;
  note?: string;
}

const LIBRARY_DIRNAME = "LyricsForge";
const CONFIG_FILENAME = "primary-storage.json";

function homeDir(): string {
  try {
    return os.homedir();
  } catch {
    return process.env.USERPROFILE || process.env.HOME || "";
  }
}

/** Resolve the user's Google Drive mount root, if present. */
export function resolveGoogleDriveRoot(): { root: string | null; source: DriveStorageStatus["source"] } {
  const envPath = process.env.LYRICSFORGE_DRIVE_ROOT || process.env.GOOGLE_DRIVE_ROOT;
  if (envPath && fs.existsSync(envPath)) {
    return { root: path.resolve(envPath), source: "env" };
  }

  const home = homeDir();
  const windowsCandidates = [
    "G:\\My Drive",
    "G:\\Google Drive",
    path.join(home, "Google Drive"),
    path.join(home, "Google Drive", "My Drive"),
    path.join(home, "My Drive"),
  ];

  // DriveFS virtual drive letters sometimes appear as other letters — probe common ones
  for (const letter of ["G", "H", "I", "F", "D"]) {
    windowsCandidates.push(`${letter}:\\My Drive`);
    windowsCandidates.push(`${letter}:\\Google Drive`);
  }

  for (const p of windowsCandidates) {
    try {
      if (p && fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) return { root: p, source: "windows-mount" };
      }
    } catch {
      /* skip */
    }
  }

  const unixCandidates = [
    path.join(home, "GoogleDrive"),
    path.join(home, "Google Drive"),
    path.join(home, "gdrive"),
    "/mnt/gdrive",
    "/Volumes/GoogleDrive",
  ];
  for (const p of unixCandidates) {
    try {
      if (fs.existsSync(p)) return { root: p, source: "unix-mount" };
    } catch {
      /* skip */
    }
  }

  return { root: null, source: "none" };
}

export function getLibraryRoot(): string | null {
  const { root } = resolveGoogleDriveRoot();
  if (!root) return null;
  return path.join(root, LIBRARY_DIRNAME);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function configPath(): string | null {
  const lib = getLibraryRoot();
  if (!lib) return null;
  return path.join(lib, "config", CONFIG_FILENAME);
}

export function readDriveConfig(): { lastSyncAt: number | null; primary: boolean } {
  const file = configPath();
  if (!file || !fs.existsSync(file)) return { lastSyncAt: null, primary: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { lastSyncAt: parsed.lastSyncAt ?? null, primary: Boolean(parsed.primary) };
  } catch {
    return { lastSyncAt: null, primary: false };
  }
}

export function writeDriveConfig(data: Record<string, unknown>): boolean {
  const file = configPath();
  if (!file) return false;
  ensureDir(path.dirname(file));
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
    device: os.hostname(),
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
  return true;
}

export function getDriveStorageStatus(): DriveStorageStatus {
  const { root, source } = resolveGoogleDriveRoot();
  const libraryRoot = root ? path.join(root, LIBRARY_DIRNAME) : null;
  const cfg = root ? readDriveConfig() : { lastSyncAt: null, primary: false };
  return {
    available: Boolean(root && libraryRoot),
    rootPath: root,
    libraryRoot,
    source,
    lastSyncAt: cfg.lastSyncAt,
    note: root
      ? `Primary cloud folder: ${libraryRoot}`
      : "Google Drive mount not found. Install Google Drive for Desktop or set LYRICSFORGE_DRIVE_ROOT.",
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateStamp(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateTimeStamp(d: Date = new Date()): string {
  return `${dateStamp(d)}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export interface LibraryPayload {
  albums?: any[];
  songs?: any[];
  meta?: Record<string, unknown>;
}

/**
 * Write library to Google Drive with labeled, dated folders:
 *   <Drive>/LyricsForge/
 *     Library/
 *       albums/<YYYY-MM-DD>_<album-slug>/
 *         album.json
 *         lyrics.txt
 *         metadata.json
 *     backups/
 *       <YYYY-MM-DD_HHMM>/
 *         library-full.json
 *         library-albums-only.json
 *     INDEX.md
 *     config/primary-storage.json
 */
export function syncLibraryToDrive(payload: LibraryPayload): {
  ok: boolean;
  libraryRoot: string | null;
  albumFolders: string[];
  backupFolder: string | null;
  error?: string;
} {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot) {
    return { ok: false, libraryRoot: null, albumFolders: [], backupFolder: null, error: getDriveStorageStatus().note };
  }

  try {
    const stamp = dateStamp();
    const now = new Date();
    const albums = Array.isArray(payload.albums) ? payload.albums : [];
    const songs = Array.isArray(payload.songs) ? payload.songs : [];

    const albumsDir = path.join(libraryRoot, "Library", "albums");
    const backupDir = path.join(libraryRoot, "backups", dateTimeStamp(now));
    ensureDir(albumsDir);
    ensureDir(backupDir);

    const albumFolders: string[] = [];
    const indexLines: string[] = [
      `# LyricsForge — Google Drive Primary Storage`,
      ``,
      `Synced: ${now.toISOString()}`,
      `Device: ${os.hostname()}`,
      `Albums: ${albums.length} · Singles: ${songs.length}`,
      ``,
      `## Folder map`,
      ``,
      `| Path | Purpose |`,
      `| --- | --- |`,
      `| \`Library/albums/<date>_<slug>/\` | One folder per album (JSON + lyrics) |`,
      `| \`backups/<datetime>/\` | Full library snapshots |`,
      `| \`config/primary-storage.json\` | Primary-storage pointer + last sync |`,
      ``,
      `## Albums`,
      ``,
    ];

    for (const album of albums) {
      const name = String(album?.name || album?.id || "untitled-album");
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "album";
      const folderName = `${stamp}_${slug}`;
      const folder = path.join(albumsDir, folderName);
      ensureDir(folder);

      fs.writeFileSync(path.join(folder, "album.json"), JSON.stringify(album, null, 2), "utf-8");

      const trackLines: string[] = [
        `====================================================================`,
        `ALBUM: ${name}`,
        `Occasion: ${album?.occasion || "N/A"}`,
        `Genres: ${(album?.genres || []).join(", ") || "N/A"}`,
        `Tracks: ${album?.songs?.length || 0}`,
        `Synced: ${now.toISOString()}`,
        `====================================================================`,
        ``,
      ];
      (album?.songs || []).forEach((s: any, i: number) => {
        trackLines.push(`--------------------------------------------------------------------`);
        trackLines.push(`TRACK ${i + 1}: ${s?.title || "Untitled"}`);
        trackLines.push(`Genre: ${s?.genre || ""} | Mood: ${s?.mood || ""} | Versions: ${s?.lyrics?.length || 0}`);
        trackLines.push(`Primary V: ${(s?.activeLyricVersion ?? 0) + 1}`);
        trackLines.push(`--------------------------------------------------------------------`);
        trackLines.push(``);
        const versions = Array.isArray(s?.lyrics) ? s.lyrics : [];
        if (versions.length === 0) {
          trackLines.push(`(No lyrics stored)`);
        } else {
          versions.forEach((ver: any, vi: number) => {
            trackLines.push(`--- Version ${vi + 1} ---`);
            trackLines.push(Array.isArray(ver) ? ver.join("\n") : String(ver || ""));
            trackLines.push(``);
          });
        }
        trackLines.push(``);
      });
      fs.writeFileSync(path.join(folder, "lyrics.txt"), trackLines.join("\n"), "utf-8");

      fs.writeFileSync(
        path.join(folder, "metadata.json"),
        JSON.stringify(
          {
            albumId: album?.id || null,
            name,
            occasion: album?.occasion || null,
            songCount: album?.songs?.length || 0,
            versionCounts: (album?.songs || []).map((s: any) => ({
              id: s?.id,
              title: s?.title,
              versions: Array.isArray(s?.lyrics) ? s.lyrics.length : 0,
            })),
            labels: ["lyricsforge", "album", dateStamp(now), slug],
            syncedAt: now.toISOString(),
            device: os.hostname(),
          },
          null,
          2
        ),
        "utf-8"
      );

      albumFolders.push(path.relative(libraryRoot, folder));
      indexLines.push(`- **${name}** → \`Library/albums/${folderName}/\``);
    }

    // Full + albums-only backups with date folder
    const fullBackup = { albums, songs, meta: { ...(payload.meta || {}), syncedAt: now.toISOString(), device: os.hostname() } };
    fs.writeFileSync(path.join(backupDir, "library-full.json"), JSON.stringify(fullBackup, null, 2), "utf-8");
    fs.writeFileSync(
      path.join(backupDir, "library-albums-only.json"),
      JSON.stringify({ albums, meta: { syncedAt: now.toISOString() } }, null, 2),
      "utf-8"
    );
    if (songs.length) {
      fs.writeFileSync(path.join(backupDir, "library-singles.json"), JSON.stringify({ songs }, null, 2), "utf-8");
    }

    indexLines.push(``, `## Backups`, ``, `- \`${path.relative(libraryRoot, backupDir)}/\` — full library snapshot`);
    fs.writeFileSync(path.join(libraryRoot, "INDEX.md"), indexLines.join("\n"), "utf-8");

    writeDriveConfig({
      primary: true,
      lastSyncAt: now.getTime(),
      lastSyncAtIso: now.toISOString(),
      lastSyncSource: "lyricsforge-server",
      albumCount: albums.length,
      songCount: songs.length,
      albumFolders,
      backupFolder: path.relative(libraryRoot, backupDir),
    });

    return { ok: true, libraryRoot, albumFolders, backupFolder: path.relative(libraryRoot, backupDir) };
  } catch (err: any) {
    return {
      ok: false,
      libraryRoot,
      albumFolders: [],
      backupFolder: null,
      error: err?.message || String(err),
    };
  }
}

/** Load the most recent full library backup from Drive, or a specific backup folder. */
export function loadLibraryFromDrive(backupFolder?: string): { ok: boolean; data: LibraryPayload | null; source?: string; error?: string } {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot) return { ok: false, data: null, error: "Google Drive not available" };

  try {
    let file: string | null = null;
    if (backupFolder) {
      file = path.join(libraryRoot, "backups", backupFolder, "library-full.json");
    } else {
      const backupsRoot = path.join(libraryRoot, "backups");
      if (!fs.existsSync(backupsRoot)) {
        // Fallback: rebuild from album folders
        return loadFromAlbumFolders(libraryRoot);
      }
      const folders = fs
        .readdirSync(backupsRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      const latest = folders[folders.length - 1];
      if (!latest) return loadFromAlbumFolders(libraryRoot);
      file = path.join(backupsRoot, latest, "library-full.json");
    }

    if (!file || !fs.existsSync(file)) return loadFromAlbumFolders(libraryRoot);
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { ok: true, data, source: file };
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || String(err) };
  }
}

function loadFromAlbumFolders(libraryRoot: string): { ok: boolean; data: LibraryPayload | null; source?: string; error?: string } {
  const albumsDir = path.join(libraryRoot, "Library", "albums");
  if (!fs.existsSync(albumsDir)) {
    return { ok: false, data: null, error: "No Drive library content found yet" };
  }
  try {
    const folders = fs
      .readdirSync(albumsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const albums: any[] = [];
    // Prefer latest dated folder per slug (suffix after first date_)
    const bySlug = new Map<string, string>();
    for (const folder of folders) {
      const slug = folder.replace(/^\d{4}-\d{2}-\d{2}_/, "");
      bySlug.set(slug, folder); // last write wins (sorted)
    }
    for (const folder of bySlug.values()) {
      const albumFile = path.join(albumsDir, folder, "album.json");
      if (fs.existsSync(albumFile)) {
        albums.push(JSON.parse(fs.readFileSync(albumFile, "utf-8")));
      }
    }
    const songs = albums.flatMap((a) => a.songs || []);
    return { ok: true, data: { albums, songs, meta: { loadedFrom: "drive-album-folders" } }, source: albumsDir };
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || String(err) };
  }
}

/** List Drive library structure for the UI. */
export function listDriveLibrary(): {
  ok: boolean;
  libraryRoot: string | null;
  albumFolders: string[];
  backups: string[];
  indexPreview?: string;
  error?: string;
} {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot || !fs.existsSync(libraryRoot)) {
    return { ok: false, libraryRoot, albumFolders: [], backups: [], error: "Drive library not initialized" };
  }
  const albumsDir = path.join(libraryRoot, "Library", "albums");
  const backupsDir = path.join(libraryRoot, "backups");
  const albumFolders = fs.existsSync(albumsDir)
    ? fs.readdirSync(albumsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const backups = fs.existsSync(backupsDir)
    ? fs.readdirSync(backupsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  let indexPreview: string | undefined;
  const indexFile = path.join(libraryRoot, "INDEX.md");
  if (fs.existsSync(indexFile)) {
    indexPreview = fs.readFileSync(indexFile, "utf-8").slice(0, 2000);
  }
  return { ok: true, libraryRoot, albumFolders, backups, indexPreview };
}
