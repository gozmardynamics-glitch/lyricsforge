/**
 * Seed Google Drive primary storage with the birthday album library
 * using the same folder layout as /api/drive/sync.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getDriveStorageStatus,
  syncLibraryToDrive,
  writeDriveConfig,
  listDriveLibrary,
} from "../src/server/driveStorage";

function main() {
  const status = getDriveStorageStatus();
  console.log("Drive status:", JSON.stringify(status, null, 2));
  if (!status.available) {
    console.error("Google Drive mount not found — cannot seed primary storage.");
    process.exit(1);
  }

  const root = process.cwd();
  const candidates = [
    join(root, "albums", "birthday-albums-library-import-full.json"),
    join(root, "albums", "birthday-albums-library-import.json"),
  ];
  let payload: any = null;
  for (const f of candidates) {
    try {
      payload = JSON.parse(readFileSync(f, "utf-8"));
      console.log("Loaded source:", f);
      break;
    } catch {
      /* next */
    }
  }
  if (!payload) {
    console.error("No album library JSON found under albums/");
    process.exit(1);
  }

  const albums = payload.albums || [];
  const songs = payload.songs || [];
  console.log(`Seeding ${albums.length} albums + ${songs.length} singles to Drive…`);

  const result = syncLibraryToDrive({
    albums,
    songs,
    meta: { source: "scripts/sync_library_to_drive.ts", primaryStorage: "google-drive" },
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
    songCount: songs.length,
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
