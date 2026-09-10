import { Song, Album } from "../types";

export const exportAlbumToFile = (album: Album, format: 'txt' | 'json' = 'txt') => {
  if (!album) return;
  let content = "";
  let mimeType = "text/plain";
  let extension = "txt";

  if (format === 'json') {
    content = JSON.stringify(album, null, 2);
    mimeType = "application/json";
    extension = "json";
  } else {
    content = `====================================================================
ALBUM PACKAGE EXPORT: ${album.name.toUpperCase()}
Occasion: ${album.occasion || 'General Release'}
Genres: ${album.genres?.join(', ') || 'Various'}
Total Tracks: ${album.songs?.length || 0}
Comments / Concept: ${album.comments || 'N/A'}
Export Date: ${new Date().toLocaleDateString()}
====================================================================

`;
    album.songs.forEach((song, idx) => {
      const lyricsStr = song.lyrics?.[0]?.join('\n') || "No lyrics provided.";
      content += `
--------------------------------------------------------------------
TRACK ${idx + 1}: ${song.title.toUpperCase()}
Genre: ${song.genre} | Mood: ${song.mood} | Approved: ${song.isApproved ? 'YES ✓' : 'NO (Draft)'}
${song.youtubeStyleLink ? `YouTube Style Ref: ${song.youtubeStyleLink}\n` : ''}${song.referenceSongTitle ? `Reference Song: ${song.referenceSongTitle}\n` : ''}${song.artistStyleName ? `Artist Style: ${song.artistStyleName}\n` : ''}--------------------------------------------------------------------

${lyricsStr}

`;
    });
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${album.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_album_package.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportSongsToFile = (songs: Song[], filename: string = 'songs_export', format: 'txt' | 'json' = 'txt') => {
  if (!songs || songs.length === 0) return;
  let content = "";
  let mimeType = "text/plain";
  let extension = "txt";

  if (format === 'json') {
    content = JSON.stringify(songs, null, 2);
    mimeType = "application/json";
    extension = "json";
  } else {
    content = `====================================================================
MUSIC PRODUCTION SONGS EXPORT
Total Tracks: ${songs.length}
Export Date: ${new Date().toLocaleDateString()}
====================================================================

`;
    songs.forEach((song, idx) => {
      const lyricsStr = song.lyrics?.[0]?.join('\n') || "No lyrics provided.";
      content += `
--------------------------------------------------------------------
SONG ${idx + 1}: ${song.title.toUpperCase()}
Genre: ${song.genre} | Mood: ${song.mood} | Approved: ${song.isApproved ? 'YES ✓' : 'NO (Draft)'}
--------------------------------------------------------------------

${lyricsStr}

`;
    });
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
