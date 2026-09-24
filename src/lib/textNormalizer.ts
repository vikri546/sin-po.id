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
    // Replace direct quotes with clean commas for smooth speech intonation
    .replace(/["“]([^"”]+)["”]/g, (_, quoteContent) => {
      const trimmed = quoteContent.trim();
      return `, ${trimmed}, `;
    })
    // Normalize multiple dashes or ellipses to clean pauses
    .replace(/\s*--+\s*/g, ', ')
    .replace(/\s*\.\.\.+\s*/g, '... ');
}

/**
 * Phonetic normalizer for Melayu Tionghoa & Ejaan Van Ophuijsen.
 * Converts historical spellings (oe -> u, dj -> j, tj -> c, etc.) so neural TTS engines
 * pronounce historical articles naturally as spoken Indonesian / classic radio broadcasts.
 */
export function normalizeMelayuTionghoa(text: string): string {
  if (!text) return '';

  let t = decodeHtmlEntities(text);

  return t
    // Ejaan Van Ophuijsen letter replacements (preserving case)
    .replace(/OE/g, 'U')
    .replace(/Oe/g, 'U')
    .replace(/oe/g, 'u')
    .replace(/DJ/g, 'J')
    .replace(/Dj/g, 'J')
    .replace(/dj/g, 'j')
    .replace(/TJ/g, 'C')
    .replace(/Tj/g, 'C')
    .replace(/tj/g, 'c')
    .replace(/NJ/g, 'NY')
    .replace(/Nj/g, 'Ny')
    .replace(/nj/g, 'ny')
    // Common Melayu Tionghoa / Melayu Rendah archaic word pronunciations for natural TTS flow
    .replace(/\bjang\b/gi, 'yang')
    .replace(/\bJang\b/g, 'Yang')
    .replace(/\bdengen\b/gi, 'dengan')
    .replace(/\btaon\b/gi, 'tahun')
    .replace(/\bboeat\b/gi, 'buat')
    .replace(/\bsoedah\b/gi, 'sudah')
    .replace(/\bmoesoe\b/gi, 'musuh')
    .replace(/\bsoldadoe\b/gi, 'serdadu')
    .replace(/\bofficier\b/gi, 'opsir')
    .replace(/\bdemonstratie\b/gi, 'demonstrasi')
    .replace(/\biaorang\b/gi, 'ia orang')
    .replace(/\bpoenja\b/gi, 'punya')
    .replace(/\bpek bin\b/gi, 'pek bin');
}

/**
 * Automatic detector for Melayu Tionghoa / Van Ophuijsen articles
 */
export function isMelayuTionghoaText(text: string): boolean {
  if (!text) return false;
  const vanOphuijsenRegex = /\b(doeloe|djadi|djoega|tjoekoep|koeat|jang|boeat|soedah|moesoe|soldadoe|iaorang|poenja|dengen|hakhaknja|dioendjoek|anak-tjoetjoe|ditakoetin|dimaloein|belaken|ngalamken)\b/i;
  return vanOphuijsenRegex.test(text);
}

/**
 * Full Indonesian News Text Normalization pipeline.
 * Sends the complete article text for full-length TTS audio generation.
 * Supports specialized vintage radio broadcast voice for "Sin Po Dulu" / Melayu Tionghoa articles.
 */
export function prepareNewsTextForTTS(
  title: string,
  author: string,
  contentHtmlOrText: string,
  isSinpoDulu?: boolean
): string {
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

  // Auto-detect Melayu Tionghoa if not explicitly specified
  const isMelayu = isSinpoDulu || isMelayuTionghoaText(`${safeTitle} ${rawText}`);

  if (isMelayu) {
    const normalizedTitle = normalizeMelayuTionghoa(normalizeIndonesianAcronyms(formatIndonesianCurrency(safeTitle)));
    const normalizedAuthor = normalizeMelayuTionghoa(normalizeIndonesianAcronyms(cleanAuthor));
    const normalizedContent = formatQuotesAndPauses(
      normalizeMelayuTionghoa(normalizeIndonesianAcronyms(formatIndonesianCurrency(rawText)))
    );

    // Vintage News Broadcast Intro for Sin Po Dulu
    return `Arsip Berita Klasik Sin Po Dulu. Judul berita: ${normalizedTitle}. Wartawan: ${normalizedAuthor}. Berita selengkapnya: ${normalizedContent}`;
  }

  // Process text normalization on full content for regular news
  const normalizedTitle = normalizeIndonesianAcronyms(formatIndonesianCurrency(safeTitle));
  const normalizedAuthor = normalizeIndonesianAcronyms(cleanAuthor);
  const normalizedContent = formatQuotesAndPauses(
    normalizeIndonesianAcronyms(formatIndonesianCurrency(rawText))
  );

  // Construct structured news reading order: Title -> Reporter/Wartawan -> Full News Content
  return `Judul berita: ${normalizedTitle}. Wartawan: ${normalizedAuthor}. Berita selengkapnya: ${normalizedContent}`;
}

