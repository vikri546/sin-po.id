export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Convert numbers (up to trillions) to Indonesian words if needed, or format currency
export function formatIndonesianCurrency(text: string): string {
  if (!text) return '';

  return decodeHtmlEntities(text)
    // Format Rp 10.000.000 or Rp10.000.000 or Rp. 10.000
    .replace(/Rp\.?\s*([\d\.\,]+)\s*(juta|miliar|triliun)?/gi, (match, amountStr, scale) => {
      const cleanNumStr = amountStr.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanNumStr);
      if (isNaN(num)) return match;

      let suffix = scale ? ` ${scale}` : '';
      return `${amountStr}${suffix} rupiah`;
    })
    // Format percentages 100% -> 100 persen
    .replace(/(\d+)\s*%/g, '$1 persen')
    // Format +62 or + -> plus
    .replace(/\+(\d+)/g, 'plus $1');
}

export function normalizeIndonesianAcronyms(text: string): string {
  if (!text) return '';

  // Abbreviations to expand or spell out letter by letter for clarity
  const acronymMap: Record<string, string> = {
    'DPR': 'D P R',
    'MPR': 'M P R',
    'DPD': 'D P D',
    'DPRD': 'D P R D',
    'TNI': 'T N I',
    'Polri': 'Polri',
    'POLRI': 'Polri',
    'PNS': 'P N S',
    'ASN': 'A S N',
    'IKN': 'I K N',
    'KPU': 'K P U',
    'KPK': 'K P K',
    'BMKG': 'B M K G',
    'BBM': 'B B M',
    'WIB': 'W I B',
    'WITA': 'W I T A',
    'WIT': 'W I T',
    'LRT': 'L R T',
    'MRT': 'M R T',
    'BUMN': 'B U M N',
    'BUMD': 'B U M D',
    'HAM': 'H A M',
    'PBB': 'P B B',
    'WHO': 'W H O',
    'UNESCO': 'Unesco',
    'USA': 'U S A',
    'US': 'U S',
    'UK': 'U K',
    'EU': 'E U',
    'IDR': 'I D R',
    'USD': 'U S D',
    'dlsb.': 'dan lain sebagainya',
    'dlsb': 'dan lain sebagainya',
    'dll.': 'dan lain-lain',
    'dll': 'dan lain-lain',
    'dkk.': 'dan kawan-kawan',
    'dkk': 'dan kawan-kawan',
    's.d.': 'sampai dengan',
    's/d': 'sampai dengan',
    'No.': 'Nomor ',
    'no.': 'nomor ',
    'Jl.': 'Jalan ',
    'jl.': 'jalan ',
    'Hal.': 'Halaman ',
    'PT.': 'P T ',
    'CV.': 'C V ',
  };

  let normalized = text;

  // Replace whole word acronyms
  Object.entries(acronymMap).forEach(([short, expanded]) => {
    const regex = new RegExp(`\\b${short.replace('.', '\\.')}\\b`, 'g');
    normalized = normalized.replace(regex, expanded);
  });

  return normalized;
}

export function formatQuotesAndPauses(text: string): string {
  if (!text) return '';

  return text
    // Replace direct quotes "..." or “...” or ‘...’ with subtle pause markers for dialogue intonation
    .replace(/["“]([^"”]+)["”]/g, (_, quoteContent) => {      const trimmed = quoteContent.trim();
      return `, <break time="0.3s" /> "${trimmed}" <break time="0.3s" />, `;
    })
    // Normalize multiple dashes or ellipses to clean SSML pauses
    .replace(/\s*--+\s*/g, ' <break time="0.4s" /> ')
    .replace(/\s*\.\.\.+\s*/g, '... <break time="0.5s" /> ');
}

/**
 * Full Indonesian News Text Normalization pipeline.
 * Sends the complete article text for full-length TTS audio generation.
 */
export function prepareNewsTextForTTS(title: string, author: string, contentHtmlOrText: string): string {
  const safeTitle = (title || '').trim();
  
  // Clean author name (remove duplicate prefixes like "Oleh:", "Penulis:", "By ")
  let cleanAuthor = (author || 'Redaksi SinPo').replace(/^(oleh|by|penulis|wartawan)\s*:\s*/gi, '').trim();
  if (!cleanAuthor) cleanAuthor = 'Redaksi SinPo';

  // Strip HTML and clean whitespace
  let rawText = (contentHtmlOrText || '')
    .replace(/<\/p>/gi, '. ')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Process text normalization on full content (no character cap)
  const normalizedTitle = normalizeIndonesianAcronyms(formatIndonesianCurrency(safeTitle));
  const normalizedAuthor = normalizeIndonesianAcronyms(cleanAuthor);
  const normalizedContent = formatQuotesAndPauses(
    normalizeIndonesianAcronyms(formatIndonesianCurrency(rawText))
  );

  // Construct structured news reading order: Title -> Reporter/Wartawan -> Full News Content
  const structuredText = `Judul berita: ${normalizedTitle}. Wartawan: ${normalizedAuthor}. Berita selengkapnya: ${normalizedContent}`;

  return structuredText;
}

