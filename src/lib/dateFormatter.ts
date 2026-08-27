/**
 * Indonesian Relative Date Formatter for SinPo.id
 */

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Converts datetime string (e.g., '2026-08-25 09:37:24', ISO string, or Date)
 * into human-readable Indonesian relative format:
 * - "Baru saja" (less than 1 minute ago)
 * - "X Menit yang lalu" (e.g. "15 Menit yang lalu")
 * - "X Jam yang lalu" (e.g. "1 Jam yang lalu", "5 Jam yang lalu")
 * - "Kemarin"
 * - "X Hari yang lalu" (2 to 6 days ago)
 * - "17 Agustus 2026" (7+ days ago)
 */
export function formatRelativeDate(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Terbaru';
  
  const inputStr = String(dateInput).trim();
  if (!inputStr) return 'Terbaru';

  // If already relative date string or fallback
  if (
    inputStr.includes('lalu') || 
    inputStr === 'Kemarin' || 
    inputStr === 'Baru saja' || 
    inputStr === 'Terbaru'
  ) {
    return inputStr;
  }

  try {
    let parseableStr = inputStr;
    // Fix SQL 'YYYY-MM-DD HH:mm:ss' to ISO 'YYYY-MM-DDTHH:mm:ss'
    if (parseableStr.includes(' ') && !parseableStr.includes('T')) {
      parseableStr = parseableStr.replace(' ', 'T');
    }

    const date = new Date(parseableStr);
    if (isNaN(date.getTime())) {
      return inputStr;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // If date is in future or under 60 seconds ago
    if (diffMs < 0 || diffMs < 60 * 1000) {
      return 'Baru saja';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${Math.max(1, diffMinutes)} Menit yang lalu`;
    }

    // Check calendar dates for Today vs Yesterday
    const isToday = now.toDateString() === date.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();

    if (isToday || (diffHours < 24 && diffDays === 0)) {
      return `${Math.max(1, diffHours)} Jam yang lalu`;
    }

    if (isYesterday || diffDays === 1) {
      return 'Kemarin';
    }

    if (diffDays >= 2 && diffDays <= 6) {
      return `${diffDays} Hari yang lalu`;
    }

    // 7+ days ago: "17 Agustus 2026"
    const day = date.getDate();
    const month = MONTH_NAMES_ID[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (e) {
    return inputStr;
  }
}

/**
 * Parses any date string (including relative ones like "1 Jam yang lalu", "Kemarin", "17 Agustus 2026", "2026-08-25 09:37:24")
 * into a valid JavaScript Date object for sorting or filtering.
 */
export function parseAnyDate(dateStr?: string | Date | null): Date {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;

  const str = String(dateStr).trim();
  if (!str || str === 'Terbaru' || str === 'Baru saja') return new Date();

  const now = new Date();

  if (str.includes('Menit yang lalu')) {
    const mins = parseInt(str, 10) || 1;
    return new Date(now.getTime() - mins * 60 * 1000);
  }

  if (str.includes('Jam yang lalu')) {
    const hrs = parseInt(str, 10) || 1;
    return new Date(now.getTime() - hrs * 3600 * 1000);
  }

  if (str === 'Kemarin') {
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    return yest;
  }

  if (str.includes('Hari yang lalu')) {
    const days = parseInt(str, 10) || 1;
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d;
  }

  // Try SQL or ISO format first
  let parseable = str;
  if (parseable.includes(' ') && !parseable.includes('T')) {
    parseable = parseable.replace(' ', 'T');
  }
  const directDate = new Date(parseable);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // Parse Indonesian text format like "17 Agustus 2026"
  try {
    let cleanStr = str;
    if (str.includes(',')) {
      cleanStr = str.split(',')[1].trim();
    }
    const parts = cleanStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);

      const months: Record<string, number> = {
        januari: 0, jan: 0,
        februari: 1, feb: 1,
        maret: 2, mar: 2,
        april: 3, apr: 3,
        mei: 4,
        juni: 5, jun: 5,
        juli: 6, jul: 6,
        agustus: 7, agt: 7, ags: 7,
        september: 8, sep: 8,
        oktober: 9, okt: 9,
        november: 10, nov: 10,
        desember: 11, des: 11
      };

      const month = months[monthStr] !== undefined ? months[monthStr] : 0;
      return new Date(year, month, day);
    }
  } catch (e) {
    // fallback below
  }

  return new Date(0);
}
