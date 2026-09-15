import zlib from 'zlib';

/**
 * Extracts clean, human-readable text from any PDF buffer,
 * decompressing FlateDecode streams and filtering out all raw binary image noise (RIFF, WEBP, PNG, etc.).
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const rawContent = buffer.toString('binary');
    const textPieces: string[] = [];

    // 1. Decompress FlateDecode streams in PDF
    const streamRegex = /\/Filter\s*\/FlateDecode[\s\S]*?stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(rawContent)) !== null) {
      try {
        const streamData = Buffer.from(match[1], 'binary');
        const decompressed = zlib.inflateSync(streamData).toString('utf-8');
        extractTextFromStream(decompressed, textPieces);
      } catch (e) {
        // Ignore stream decode errors
      }
    }

    // 2. Also extract text from uncompressed BT ... ET blocks in PDF
    const btBlocks = rawContent.match(/BT[\s\S]*?ET/g) || [];
    btBlocks.forEach((block) => {
      extractTextFromStream(block, textPieces);
    });

    let result = textPieces.join(' ').replace(/\s+/g, ' ').trim();

    // 3. Fallback: If no text streams matched, extract plain ASCII word sequences (excluding binary noise)
    if (result.length < 15) {
      const asciiStrings = rawContent.match(/[a-zA-Z0-9\s.,#+@-]{4,}/g) || [];
      result = asciiStrings
        .filter(
          (s) =>
            !s.startsWith('/') &&
            !s.startsWith('%') &&
            !s.includes('<<') &&
            !s.includes('>>') &&
            !s.includes('stream') &&
            !s.includes('endstream') &&
            !s.includes('xref') &&
            !s.includes('Font') &&
            !s.includes('Obj') &&
            !s.includes('RIFF') &&
            !s.includes('WEBP') &&
            !s.includes('PNG') &&
            !s.includes('JFIF') &&
            !s.includes('VP8') &&
            !/^[a-zA-Z0-9]{1,4}$/.test(s) // Filter out random short junk strings
        )
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // FINAL SANITATION: Remove any leftover binary headers
    result = result
      .replace(/RIFF[\s\S]*?WEBPVP8/gi, '')
      .replace(/WEBPVP8[^\s]*/gi, '')
      .replace(/[^\x20-\x7E\s]/g, '')
      .trim();

    return result;
  } catch (err) {
    console.error('PDF text extraction error:', err);
    return '';
  }
}

function extractTextFromStream(streamText: string, outPieces: string[]) {
  // Match text in (string) Tj or (string) TJ
  const parenthesized = streamText.match(/\(([^)]+)\)/g) || [];
  parenthesized.forEach((p) => {
    const clean = p.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
    if (clean.length > 0 && /^[\x20-\x7E\s]+$/.test(clean) && !clean.includes('RIFF') && !clean.includes('WEBP')) {
      outPieces.push(clean);
    }
  });

  // Match text in [ (str1) 12 (str2) ] TJ array format
  const arrayFormat = streamText.match(/\[([\s\S]*?)\]\s*TJ/gi) || [];
  arrayFormat.forEach((arr) => {
    const strings = arr.match(/\(([^)]+)\)/g) || [];
    strings.forEach((s) => {
      const clean = s.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
      if (clean.length > 0 && /^[\x20-\x7E\s]+$/.test(clean) && !clean.includes('RIFF') && !clean.includes('WEBP')) {
        outPieces.push(clean);
      }
    });
  });
}
