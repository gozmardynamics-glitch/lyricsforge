import { jsPDF } from 'jspdf';

// --- PDF EXPORT UTILITY (jsPDF) ---
export interface PdfExportOptions {
  title: string;
  artist?: string;
  genre?: string;
  mood?: string;
  key?: string;
  bpm?: number | string;
  occasion?: string;
  language?: string;
  lyricsText: string;
  chordProgressions?: { name?: string; chords?: string[]; numerals?: string }[];
  includeChords?: boolean;
}

export const generateLyricsPdf = (options: PdfExportOptions) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Header Box with Dark Indigo/Slate Gradient-style Solid
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(20, 184, 166); // teal-400
    doc.text(options.title || "Song Lyrics & Lead Sheet", margin + 6, y + 9);

    // Meta line 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(241, 245, 249);
    const meta1 = `Genre: ${options.genre || 'Pop'}   |   Mood: ${options.mood || 'Dynamic'}   |   Tempo: ${options.bpm ? options.bpm + ' BPM' : '120 BPM'}   |   Key: ${options.key || 'C Major'}`;
    doc.text(meta1, margin + 6, y + 16);

    // Meta line 2
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const meta2 = `Occasion: ${options.occasion || 'Studio Master'}   |   Language: ${options.language || 'English'}   |   Exported: ${new Date().toLocaleDateString()}`;
    doc.text(meta2, margin + 6, y + 21);

    y += 30;

    // Optional Chords Banner
    if (options.chordProgressions && options.chordProgressions.length > 0) {
      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text("RECOMMENDED CHORD HARMONIES:", margin + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      const chordLine = options.chordProgressions.slice(0, 3).map(p => 
        `${p.name ? p.name + ': ' : ''}${p.chords ? p.chords.join(' - ') : (p.numerals || '')}`
      ).join('   |   ');
      doc.text(chordLine || "I - V - vi - IV (C - G - Am - F)", margin + 4, y + 10.5);

      y += 18;
    }

    // Lyrics Content
    const lines = (options.lyricsText || "").split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    lines.forEach((rawLine) => {
      // Check page overflow
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin + 5;
        // Page continuity header
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${options.title} • (Lead Sheet Continued)`, margin, y);
        y += 7;
      }

      const trimmed = rawLine.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // Section title (e.g. [Verse 1], [Chorus])
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(13, 148, 136); // Teal section header
        doc.text(trimmed.toUpperCase(), margin, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
      } else if (trimmed.startsWith('#')) {
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(trimmed.replace(/^#+\s*/, ''), margin, y);
        y += 4.5;
      } else if (!trimmed) {
        y += 3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const splitText = doc.splitTextToSize(rawLine, contentWidth);
        doc.text(splitText, margin, y);
        y += (splitText.length * 4.2);
      }
    });

    // Add footer page numbers
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Lyricist Pro AI Studio • Page ${i} of ${totalPages} • Generated ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      );
    }

    const filename = `${(options.title || 'lyrics').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_lead_sheet.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    alert("Error generating PDF. Please check your browser permissions.");
  }
};
