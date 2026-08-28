import { ApiResponse } from '@/types/api';
import { Article } from '@/types';
import { stripHtml } from './htmlRenderer';
import { formatRelativeDate, parseAnyDate } from './dateFormatter';
import { getNumericId } from './urlHelpers';

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return 'https://api.sinpo.id/api';
};

const getApiToken = () => {
  return process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';
};

const getStorageBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
  if (envUrl && envUrl.trim() !== '') return envUrl;
  return 'https://sinpo.id/storage';
};

const API_BASE_URL = getApiBaseUrl();
const API_TOKEN = getApiToken();
const STORAGE_BASE_URL = getStorageBaseUrl();

export { API_BASE_URL, API_TOKEN, STORAGE_BASE_URL };

export interface FetchOptions extends RequestInit {
  token?: string;
  revalidate?: number | false;
  skipCacheBuster?: boolean;
}

/**
 * Core fetch wrapper for SinPo.id REST API with real-time cache busting
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { token = API_TOKEN, revalidate = 0, headers, skipCacheBuster = false, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    requestHeaders['X-Api-Key'] = token;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Append cache-buster _t=timestamp for GET requests to ensure real-time news
  let url = `${API_BASE_URL}${cleanEndpoint}`;
  if (!skipCacheBuster && (!customConfig.method || customConfig.method.toUpperCase() === 'GET')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}_t=${Date.now()}`;
  }

  const fetchConfig: RequestInit = {
    cache: 'no-store', // Always get fresh data from network
    ...customConfig,
    headers: requestHeaders,
  };

  try {
    const res = await fetch(url, fetchConfig);
    if (!res.ok) {
      const apiError: any = new Error(`HTTP error! status: ${res.status}`);
      apiError.status = res.status;
      apiError.isNotFound = res.status === 404;
      throw apiError;
    }
    const data: ApiResponse<T> = await res.json();
    if (data.success === false) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (err: any) {
    console.warn(`apiFetch notice [${cleanEndpoint}]:`, err?.message || err);
    throw err;
  }
}

/**
 * Triggers counter increment for an article via /counter.php
 * (Matching sinpo 2 updateArticleCounter)
 */
export async function incrementArticleViewCounter(articleId: string | number): Promise<number | null> {
  const numericId = getNumericId(String(articleId));
  if (!numericId) return null;

  try {
    const res = await fetch('https://sinpo.id/counter.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_berita: Number(numericId) }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    if (result && result.success && result.counter !== undefined) {
      const count = Number(result.counter);
      return !isNaN(count) && count > 0 ? count : null;
    }
  } catch (err) {
    console.warn('Counter update notice:', err);
  }
  return null;
}

// ==========================================
// REAL-TIME TAKEDOWN & CMS SYNC SYSTEM
// (Matching sinpo 2 app.js reference)
// ==========================================
export const TAKEDOWN_ARTICLE_IDS = new Set<number>([125293, 125206, 1000, 126031]);

/**
 * Parse publish date from raw article data or transformed Article object for schedule checking
 * (Matching sinpo 2 parseArticlePublishDate)
 */
export function parseArticlePublishDate(articleOrId: any): Date | null {
  if (!articleOrId || typeof articleOrId !== 'object') return null;

  if (typeof articleOrId.publishedAtMs === 'number' && articleOrId.publishedAtMs > 0) {
    return new Date(articleOrId.publishedAtMs);
  }

  const dateVal = articleOrId.published_at || articleOrId.tanggal_tayang || articleOrId.created_at;
  const timeVal = articleOrId.waktu;

  if (!dateVal) return null;

  try {
    let dateStr = String(dateVal).trim();
    if (dateStr.includes('T')) {
      const parts = dateStr.split('T');
      const dPart = parts[0];
      let tPart = parts[1];
      if (timeVal && typeof timeVal === 'string' && !tPart.includes('Z')) {
        tPart = timeVal;
      }
      dateStr = `${dPart}T${tPart}`;
    } else if (dateStr.includes(' ')) {
      const [dPart, tPart] = dateStr.split(' ');
      dateStr = `${dPart}T${timeVal || tPart}`;
    } else if (timeVal && typeof timeVal === 'string') {
      dateStr = `${dateStr}T${timeVal}`;
    }

    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch {
    // Fallback
  }
  return null;
}

/**
 * Check if article is scheduled for future publish or accelerated schedule by redaksi
 * (Matching sinpo 2 isScheduledArticle)
 */
export function isScheduledArticle(articleOrId: any): boolean {
  if (!articleOrId || typeof articleOrId !== 'object') return false;

  const pubStr = articleOrId.publish !== undefined && articleOrId.publish !== null
    ? String(articleOrId.publish).toLowerCase().trim()
    : '';
  const statStr = articleOrId.status !== undefined && articleOrId.status !== null
    ? String(articleOrId.status).toLowerCase().trim()
    : '';

  // Explicit scheduled status flags from CMS
  if (
    pubStr === '2' || pubStr === 'scheduled' || pubStr === 'jadwal' || pubStr === 'terjadwal' ||
    statStr === '2' || statStr === 'scheduled' || statStr === 'jadwal' || statStr === 'terjadwal' ||
    articleOrId.is_scheduled === true || articleOrId.scheduled === true
  ) {
    return true;
  }

  // If status is explicitly unpublished (0), it is takedown, not scheduled
  if (pubStr === '0' || statStr === '0') {
    return false;
  }

  // Check future publish timestamp
  const pubDate = parseArticlePublishDate(articleOrId);
  if (pubDate) {
    const now = Date.now();
    // If publish date is in future by more than 5 seconds, it's scheduled
    if (pubDate.getTime() > now + 5000) {
      // If publish status is explicitly 1 (published) and date is within 5 minutes (redaksi accelerated publish)
      if (pubStr === '1' && pubDate.getTime() <= now + 300000) {
        return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Check if article is taken down or scheduled (not live yet)
 * (Matching sinpo 2 isTakedownArticle)
 */
export function isTakedownArticle(articleOrId: any): boolean {
  if (!articleOrId) return true;
  const id = typeof articleOrId === 'object'
    ? Number(articleOrId.id || articleOrId.id_berita || 0)
    : Number(articleOrId);
  if (id && TAKEDOWN_ARTICLE_IDS.has(id)) {
    return true;
  }
  if (typeof articleOrId === 'object') {
    if (articleOrId.publish !== undefined && articleOrId.publish !== null && String(articleOrId.publish) === '0') {
      return true;
    }
    if (articleOrId.status !== undefined && articleOrId.status !== null &&
        (articleOrId.status === 0 || String(articleOrId.status) === '0' || articleOrId.status === false)) {
      return true;
    }
    if (isScheduledArticle(articleOrId)) {
      return true;
    }
  }
  return false;
}

/**
 * Format image URL from backend storage path
 */
export function getStorageUrl(path?: string | null): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return 'https://placehold.co/800x600/1e293b/ffffff?text=SinPo+Media';
  }

  let cleanPath = path.trim();

  // Normalize backend dev/api domain hosts if returned by CMS
  if (cleanPath.includes('localhost:8000') || cleanPath.includes('127.0.0.1:8000') || cleanPath.includes('api.sinpo.id')) {
    try {
      const urlObj = new URL(cleanPath);
      cleanPath = urlObj.pathname;
    } catch {
      cleanPath = cleanPath.replace(/^https?:\/\/[^\/]+/, '');
    }
  }

  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  // Root domain asset paths (storage/, uploads/, gambar/, foto/, asset/, assets/)
  if (
    cleanPath.startsWith('storage/') ||
    cleanPath.startsWith('uploads/') ||
    cleanPath.startsWith('gambar/') ||
    cleanPath.startsWith('foto/') ||
    cleanPath.startsWith('asset/') ||
    cleanPath.startsWith('assets/')
  ) {
    return `https://sinpo.id/${cleanPath}`;
  }

  // Auto-fix bare filenames that lack year/month folder prefix using DDMMYYYY date pattern before timestamp
  if (!cleanPath.includes('/')) {
    const dateMatch = cleanPath.match(/(\d{2})(\d{2})(\d{4})-\d+\.(?:jpg|png|jpeg|webp|gif)$/i);
    if (dateMatch) {
      const month = dateMatch[2];
      const year = dateMatch[3];
      cleanPath = `${year}/${month}/${cleanPath}`;
    }
  }

  return `https://sinpo.id/storage/${cleanPath}`;
}

/**
 * Fixes relative or broken image src attributes in raw HTML article content
 * (Matching sinpo 2 fixContentImages algorithm)
 */
export function fixContentImages(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<img([^>]+)src=["']([^"']+)["']/gi, (match, attrs, src) => {
    if (!src || src.startsWith('data:')) return match;

    let cleanSrc = src.trim();
    if (cleanSrc.includes('localhost:8000') || cleanSrc.includes('127.0.0.1:8000') || cleanSrc.includes('api.sinpo.id')) {
      try {
        const urlObj = new URL(cleanSrc);
        cleanSrc = urlObj.pathname;
      } catch {
        cleanSrc = cleanSrc.replace(/^https?:\/\/[^\/]+/, '');
      }
    }

    let newSrc = cleanSrc;
    if (!cleanSrc.startsWith('http://') && !cleanSrc.startsWith('https://')) {
      newSrc = getStorageUrl(cleanSrc);
    }

    let cleanAttrs = attrs.replace(/\s*onerror=["'][^"']*["']/gi, '');
    return `<img${cleanAttrs}src="${newSrc}" loading="lazy" onerror="this.onerror=null;this.style.display='none';"`;
  });
}

/**
 * Transform SinPo API post item (legacy or new Laravel format) to Next.js Article interface
 */
export function transformLaravelPostToArticle(item: any): Article {
  if (!item) {
    return {
      id: 'laravel-0',
      title: 'Tanpa Judul',
      subtitle: '',
      summary: '',
      content: '',
      category: 'NASIONAL',
      imageUrl: getStorageUrl(null),
      date: '',
      author: 'Redaksi SinPo',
      readTime: '3 Menit Baca',
      tags: ['NASIONAL', 'SINPO MEDIA'],
      comments: [],
    };
  }

  const rawId = item.id || item.id_berita || 0;
  const title = stripHtml(item.judul || item.title || 'Tanpa Judul');
  
  // Category / Channel resolution
  const channelName = item.datachannel?.nama || item.kanal?.nama || item.channel?.name || '';
  const categoryNameRaw = item.datakategori?.nama || item.kategori?.nama || item.category?.name || channelName || 'NASIONAL';
  const categoryName = stripHtml(categoryNameRaw).toUpperCase() || 'NASIONAL';

  // Image resolution
  const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.image_url || item.foto || '';
  const imageUrl = getStorageUrl(rawImage);

  // Author resolution
  let authorName = 'Redaksi SinPo';
  if (item.datawartawan?.nama_wartawan) {
    authorName = stripHtml(item.datawartawan.nama_wartawan);
  } else if (item.penulis) {
    authorName = typeof item.penulis === 'object' ? stripHtml(item.penulis.nama || item.penulis.name || '') : stripHtml(item.penulis);
  } else if (item.author) {
    authorName = typeof item.author === 'object' ? stripHtml(item.author.name || item.author.nama || '') : stripHtml(item.author);
  } else if (item.wartawan) {
    authorName = typeof item.wartawan === 'object' ? stripHtml(item.wartawan.name || item.wartawan.nama_wartawan || '') : stripHtml(item.wartawan);
  }
  authorName = authorName.replace(/\u00a0/g, ' ').trim();
  if (!authorName) authorName = 'Redaksi SinPo';

  // Summary & Content resolution
  const rawContent = fixContentImages(item.isi || item.content || '');
  const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || '';
  const cleanSummary = stripHtml(rawSummary) || (rawContent ? stripHtml(rawContent).slice(0, 180) : '');

  // Tags resolution
  const rawTags = item.tag || item.tags || '';
  let tagsList: string[] = [];
  if (typeof rawTags === 'string') {
    tagsList = rawTags.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean);
  } else if (Array.isArray(rawTags)) {
    tagsList = rawTags.map((t: any) => (typeof t === 'string' ? t.toUpperCase() : (t.name || '').toUpperCase())).filter(Boolean);
  }

  // Views resolution
  const viewsCount = typeof item.counter === 'number'
    ? item.counter
    : (typeof item.dilihat === 'number'
        ? item.dilihat
        : (typeof item.views === 'number'
            ? item.views
            : (parseInt(item.counter || item.dilihat || item.views || '0', 10) || 0)));

  // Date & Time resolution (combine tanggal_tayang / published_at / created_at with waktu)
  const rawDateVal = item.tanggal_tayang || item.published_at || item.created_at || '';
  const timeVal = item.waktu || item.time || '';

  let publishedAtMs = 0;
  let formattedDateStr = String(rawDateVal).trim();
  if (formattedDateStr) {
    let datePart = formattedDateStr;
    if (datePart.includes('T')) {
      datePart = datePart.split('T')[0];
    } else if (datePart.includes(' ')) {
      datePart = datePart.split(' ')[0];
    }

    if (timeVal && typeof timeVal === 'string' && timeVal.trim() !== '') {
      const cleanTime = timeVal.trim();
      formattedDateStr = `${datePart}T${cleanTime.length === 5 ? cleanTime + ':00' : cleanTime}+07:00`;
    } else if (formattedDateStr.includes('T')) {
      const timePart = formattedDateStr.split('T')[1]?.replace('.000000Z', '').replace('Z', '');
      if (timePart && timePart !== '00:00:00') {
        formattedDateStr = `${datePart}T${timePart}+07:00`;
      } else {
        formattedDateStr = `${datePart}T00:00:00+07:00`;
      }
    }

    const dObj = parseAnyDate(formattedDateStr);
    if (dObj && !isNaN(dObj.getTime())) {
      publishedAtMs = dObj.getTime();
    }
  }

  const captionText = stripHtml(item.caption || item.image_caption || item.caption_gambar || '');
  const isHero = Boolean(item.is_hero || item.is_headline || item.headline === '1' || item.headline === 1);

  return {
    id: `laravel-${rawId}`,
    slug: item.slug || '',
    title,
    subtitle: cleanSummary,
    summary: cleanSummary,
    content: rawContent,
    category: categoryName,
    imageUrl,
    date: formatRelativeDate(formattedDateStr),
    publishedAtMs: publishedAtMs || parseAnyDate(rawDateVal).getTime() || 0,
    author: authorName,
    readTime: '3 Menit Baca',
    tags: tagsList.length > 0 ? tagsList : [categoryName, 'SINPO MEDIA'],
    comments: [],
    isHero,
    isHeadline: isHero,
    headline: String(item.headline || ''),
    isInvestigative: categoryName === 'BONGKAR',
    views: viewsCount,
    dilihat: viewsCount,
    caption: captionText,
  };
}
