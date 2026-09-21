"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/sync_library_to_drive.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// src/server/driveStorage.ts
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);
var os = __toESM(require("node:os"), 1);
var LIBRARY_DIRNAME = "LyricsForge";
var CONFIG_FILENAME = "primary-storage.json";
function homeDir() {
  try {
    return os.homedir();
  } catch {
    return process.env.USERPROFILE || process.env.HOME || "";
  }
}
function resolveGoogleDriveRoot() {
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
    path.join(home, "My Drive")
  ];
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
    }
  }
  const unixCandidates = [
    path.join(home, "GoogleDrive"),
    path.join(home, "Google Drive"),
    path.join(home, "gdrive"),
    "/mnt/gdrive",
    "/Volumes/GoogleDrive"
  ];
  for (const p of unixCandidates) {
    try {
      if (fs.existsSync(p)) return { root: p, source: "unix-mount" };
    } catch {
    }
  }
  return { root: null, source: "none" };
}
function getLibraryRoot() {
  const { root } = resolveGoogleDriveRoot();
  if (!root) return null;
  return path.join(root, LIBRARY_DIRNAME);
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function configPath() {
  const lib = getLibraryRoot();
  if (!lib) return null;
  return path.join(lib, "config", CONFIG_FILENAME);
}
function readDriveConfig() {
  const file = configPath();
  if (!file || !fs.existsSync(file)) return { lastSyncAt: null, primary: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { lastSyncAt: parsed.lastSyncAt ?? null, primary: Boolean(parsed.primary) };
  } catch {
    return { lastSyncAt: null, primary: false };
  }
}
function writeDriveConfig(data) {
  const file = configPath();
  if (!file) return false;
  ensureDir(path.dirname(file));
  const payload = {
    ...data,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    device: os.hostname()
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
  return true;
}
function getDriveStorageStatus() {
  const { root, source } = resolveGoogleDriveRoot();
  const libraryRoot = root ? path.join(root, LIBRARY_DIRNAME) : null;
  const cfg = root ? readDriveConfig() : { lastSyncAt: null, primary: false };
  return {
    available: Boolean(root && libraryRoot),
    rootPath: root,
    libraryRoot,
    source,
    lastSyncAt: cfg.lastSyncAt,
    note: root ? `Primary cloud folder: ${libraryRoot}` : "Google Drive mount not found. Install Google Drive for Desktop or set LYRICSFORGE_DRIVE_ROOT."
  };
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function dateStamp(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dateTimeStamp(d = /* @__PURE__ */ new Date()) {
  return `${dateStamp(d)}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function syncLibraryToDrive(payload) {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot) {
    return { ok: false, libraryRoot: null, albumFolders: [], backupFolder: null, error: getDriveStorageStatus().note };
  }
  try {
    const stamp = dateStamp();
    const now = /* @__PURE__ */ new Date();
    const albums = Array.isArray(payload.albums) ? payload.albums : [];
    const songs = Array.isArray(payload.songs) ? payload.songs : [];
    const albumsDir = path.join(libraryRoot, "Library", "albums");
    const backupDir = path.join(libraryRoot, "backups", dateTimeStamp(now));
    ensureDir(albumsDir);
    ensureDir(backupDir);
    const albumFolders = [];
    const indexLines = [
      `# LyricsForge \u2014 Google Drive Primary Storage`,
      ``,
      `Synced: ${now.toISOString()}`,
      `Device: ${os.hostname()}`,
      `Albums: ${albums.length} \xB7 Singles: ${songs.length}`,
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
      ``
    ];
    for (const album of albums) {
      const name = String(album?.name || album?.id || "untitled-album");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "album";
      const folderName = `${stamp}_${slug}`;
      const folder = path.join(albumsDir, folderName);
      ensureDir(folder);
      fs.writeFileSync(path.join(folder, "album.json"), JSON.stringify(album, null, 2), "utf-8");
      const trackLines = [
        `====================================================================`,
        `ALBUM: ${name}`,
        `Occasion: ${album?.occasion || "N/A"}`,
        `Genres: ${(album?.genres || []).join(", ") || "N/A"}`,
        `Tracks: ${album?.songs?.length || 0}`,
        `Synced: ${now.toISOString()}`,
        `====================================================================`,
        ``
      ];
      (album?.songs || []).forEach((s, i) => {
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
          versions.forEach((ver, vi) => {
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
            versionCounts: (album?.songs || []).map((s) => ({
              id: s?.id,
              title: s?.title,
              versions: Array.isArray(s?.lyrics) ? s.lyrics.length : 0
            })),
            labels: ["lyricsforge", "album", dateStamp(now), slug],
            syncedAt: now.toISOString(),
            device: os.hostname()
          },
          null,
          2
        ),
        "utf-8"
      );
      albumFolders.push(path.relative(libraryRoot, folder));
      indexLines.push(`- **${name}** \u2192 \`Library/albums/${folderName}/\``);
    }
    const fullBackup = { albums, songs, meta: { ...payload.meta || {}, syncedAt: now.toISOString(), device: os.hostname() } };
    fs.writeFileSync(path.join(backupDir, "library-full.json"), JSON.stringify(fullBackup, null, 2), "utf-8");
    fs.writeFileSync(
      path.join(backupDir, "library-albums-only.json"),
      JSON.stringify({ albums, meta: { syncedAt: now.toISOString() } }, null, 2),
      "utf-8"
    );
    if (songs.length) {
      fs.writeFileSync(path.join(backupDir, "library-singles.json"), JSON.stringify({ songs }, null, 2), "utf-8");
    }
    indexLines.push(``, `## Backups`, ``, `- \`${path.relative(libraryRoot, backupDir)}/\` \u2014 full library snapshot`);
    fs.writeFileSync(path.join(libraryRoot, "INDEX.md"), indexLines.join("\n"), "utf-8");
    writeDriveConfig({
      primary: true,
      lastSyncAt: now.getTime(),
      lastSyncAtIso: now.toISOString(),
      lastSyncSource: "lyricsforge-server",
      albumCount: albums.length,
      songCount: songs.length,
      albumFolders,
      backupFolder: path.relative(libraryRoot, backupDir)
    });
    return { ok: true, libraryRoot, albumFolders, backupFolder: path.relative(libraryRoot, backupDir) };
  } catch (err) {
    return {
      ok: false,
      libraryRoot,
      albumFolders: [],
      backupFolder: null,
      error: err?.message || String(err)
    };
  }
}
function listDriveLibrary() {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot || !fs.existsSync(libraryRoot)) {
    return { ok: false, libraryRoot, albumFolders: [], backups: [], error: "Drive library not initialized" };
  }
  const albumsDir = path.join(libraryRoot, "Library", "albums");
  const backupsDir = path.join(libraryRoot, "backups");
  const albumFolders = fs.existsSync(albumsDir) ? fs.readdirSync(albumsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
  const backups = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
  let indexPreview;
  const indexFile = path.join(libraryRoot, "INDEX.md");
  if (fs.existsSync(indexFile)) {
    indexPreview = fs.readFileSync(indexFile, "utf-8").slice(0, 2e3);
  }
  return { ok: true, libraryRoot, albumFolders, backups, indexPreview };
}

// scripts/sync_library_to_drive.ts
function main() {
  const status = getDriveStorageStatus();
  console.log("Drive status:", JSON.stringify(status, null, 2));
  if (!status.available) {
    console.error("Google Drive mount not found \u2014 cannot seed primary storage.");
    process.exit(1);
  }
  const root = process.cwd();
  const candidates = [
    (0, import_node_path.join)(root, "albums", "birthday-albums-library-import-full.json"),
    (0, import_node_path.join)(root, "albums", "birthday-albums-library-import.json")
  ];
  let payload = null;
  for (const f of candidates) {
    try {
      payload = JSON.parse((0, import_node_fs.readFileSync)(f, "utf-8"));
      console.log("Loaded source:", f);
      break;
    } catch {
    }
  }
  if (!payload) {
    console.error("No album library JSON found under albums/");
    process.exit(1);
  }
  const albums = payload.albums || [];
  const songs = payload.songs || [];
  console.log(`Seeding ${albums.length} albums + ${songs.length} singles to Drive\u2026`);
  const result = syncLibraryToDrive({
    albums,
    songs,
    meta: { source: "scripts/sync_library_to_drive.ts", primaryStorage: "google-drive" }
  });
  if (!result.ok) {
    console.error("Sync failed:", result.error);
    process.exit(1);
  }
  writeDriveConfig({
    primary: true,
    lastSyncAt: Date.now(),
    lastSyncSource: "scripts/sync_library_to_drive.ts",
    albumCount: albums.length,
    songCount: songs.length
  });
  console.log("OK");
  console.log("Library root:", result.libraryRoot);
  console.log("Album folders:");
  result.albumFolders.forEach((f) => console.log(" -", f));
  console.log("Backup folder:", result.backupFolder);
  const listing = listDriveLibrary();
  console.log("\nDrive listing:");
  console.log(" albums:", listing.albumFolders.join(", "));
  console.log(" backups:", listing.backups.join(", "));
  if (listing.indexPreview) {
    console.log("\nINDEX.md preview:\n" + listing.indexPreview);
  }
}
main();
