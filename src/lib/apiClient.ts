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
  forceRefresh?: boolean;
  cacheTtlMs?: number;
}

// In-memory cache & request deduplication store for SinPo API calls
interface ApiCacheEntry<T> {
  data: ApiResponse<T>;
  timestamp: number;
}

const apiMemoryCache = new Map<string, ApiCacheEntry<any>>();
const inflightApiRequests = new Map<string, Promise<ApiResponse<any>>>();
const DEFAULT_CACHE_TTL_MS = 15000; // 15 seconds memory cache

export function clearApiCache(endpointPattern?: string) {
  if (!endpointPattern) {
    apiMemoryCache.clear();
    return;
  }
  for (const key of apiMemoryCache.keys()) {
    if (key.includes(endpointPattern)) {
      apiMemoryCache.delete(key);
    }
  }
}

/**
 * Core fetch wrapper for SinPo.id REST API with real-time cache busting,
 * inflight request deduplication, and memory caching for ultra-fast loading.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    token = API_TOKEN,
    revalidate = 0,
    headers,
    skipCacheBuster = false,
    forceRefresh = false,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    ...customConfig
  } = options;

  const isGetRequest = !customConfig.method || customConfig.method.toUpperCase() === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Clean cache key (strip cache-busting _t timestamp parameter for key matching)
  const cacheKey = cleanEndpoint.replace(/([?&])_t=\d+/g, '').replace(/(\?|&)$/, '');

  // 1. Serve from in-memory cache if available, valid, and not forced to refresh
  if (isGetRequest && !forceRefresh) {
    const cached = apiMemoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < cacheTtlMs)) {
      return cached.data;
    }
  }

  // 2. Request Deduplication: Reuse inflight fetch promise if an identical GET request is currently pending
  if (isGetRequest && !forceRefresh && inflightApiRequests.has(cacheKey)) {
    return inflightApiRequests.get(cacheKey)!;
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    requestHeaders['X-Api-Key'] = token;
  }

  // Append cache-buster _t=timestamp for GET requests when actually making network call
  let url = `${API_BASE_URL}${cleanEndpoint}`;
  if (!skipCacheBuster && isGetRequest) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}_t=${Date.now()}`;
  }

  const fetchConfig: RequestInit = {
    cache: 'no-store', // Always get fresh data from network when fetching
    ...customConfig,
    headers: requestHeaders,
  };

  const fetchPromise = (async (): Promise<ApiResponse<T>> => {
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

      // Store in memory cache for GET requests
      if (isGetRequest && data) {
        apiMemoryCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (err: any) {
      console.warn(`apiFetch notice [${cleanEndpoint}]:`, err?.message || err);
      throw err;
    } finally {
      if (isGetRequest) {
        inflightApiRequests.delete(cacheKey);
      }
    }
  })();

  if (isGetRequest) {
    inflightApiRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
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
// Dynamic runtime takedown + hardcoded fallback IDs
// ==========================================
export const TAKEDOWN_ARTICLE_IDS = new Set<number>([125293, 125206, 1000, 126031, 129259, 129503]);
const _runtimeTakedownIds = new Set<number>();

/** Helper to extract numeric ID from numbers, '125293', 'laravel-125293', or objects */
export function extractNumericArticleId(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Add an article ID to the runtime takedown blacklist (called when API returns publish=0) */
export function addTakedownId(id: number) {
  if (id && id > 0) _runtimeTakedownIds.add(id);
}

/** Check if an article ID is in the runtime takedown blacklist */
export function isRuntimeTakedown(id: number): boolean {
  return id > 0 && _runtimeTakedownIds.has(id);
}

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
    let dPart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];

    let tPart = '00:00:00';
    if (timeVal && typeof timeVal === 'string' && timeVal.trim() !== '') {
      tPart = timeVal.trim();
      if (tPart.length === 5) tPart += ':00';
    } else if (dateStr.includes('T')) {
      const rawTime = dateStr.split('T')[1].replace('.000000Z', '').replace('Z', '');
      if (rawTime && rawTime !== '00:00:00') {
        tPart = rawTime;
      }
    } else if (dateStr.includes(' ')) {
      const rawTime = dateStr.split(' ')[1];
      if (rawTime) tPart = rawTime;
    }

    const fullIso = `${dPart}T${tPart}+07:00`;
    const parsedDate = new Date(fullIso);
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

  // Check future publish timestamp (combining tanggal_tayang + waktu)
  const pubDate = parseArticlePublishDate(articleOrId);
  if (pubDate) {
    const now = Date.now();
    // If publish date/time is in the future by > 5 seconds, it's scheduled (not live yet)
    if (pubDate.getTime() > now + 5000) {
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

  let id = 0;
  if (typeof articleOrId === 'object') {
    id = extractNumericArticleId(articleOrId.rawId || articleOrId.id_berita || articleOrId.id);
  } else {
    id = extractNumericArticleId(articleOrId);
  }

  // 1. Check known hardcoded takedown IDs + dynamic runtime blacklist
  if (id > 0 && (TAKEDOWN_ARTICLE_IDS.has(id) || isRuntimeTakedown(id))) {
    return true;
  }

  if (typeof articleOrId === 'object') {
    const pubStr = articleOrId.publish !== undefined && articleOrId.publish !== null
      ? String(articleOrId.publish).trim()
      : '';
    const statStr = articleOrId.status !== undefined && articleOrId.status !== null
      ? String(articleOrId.status).trim()
      : '';

    // 2. CMS publish=0 means article is taken down by redaksi
    if (pubStr === '0') {
      if (id > 0) addTakedownId(id);
      return true;
    }
    // 3. CMS status=0 means article is unpublished
    if (statStr === '0' || articleOrId.status === false) {
      if (id > 0) addTakedownId(id);
      return true;
    }
    // 4. Scheduled articles (future publish date) are not live yet
    if (isScheduledArticle(articleOrId)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract the upload timestamp embedded in SinPo CMS image filenames.
 * CMS saves uploads as `<slug>-DDMMYYYY-HHMMSS.jpg` (e.g. `...-01102026-083332.jpg`),
 * so every re-upload produces a new filename with a newer timestamp.
 * Returns 0 when the filename has no recognizable timestamp.
 */
export function extractImageTimestamp(url?: string | null): number {
  if (!url || typeof url !== 'string') return 0;
  const clean = url.split('?')[0];
  const match = clean.match(/(\d{2})(\d{2})(\d{4})-(\d{2})(\d{2})(\d{2})\.\w+$/);
  if (!match) return 0;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return 0;
  const t = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+07:00`).getTime();
  return isNaN(t) ? 0 : t;
}

const isPlaceholderImage = (url?: string | null): boolean =>
  !url || url.includes('placehold.co') || url.includes('sinpo-favicon') || url.includes('sinpo-og-banner');

/**
 * Automatically decide which image URL to display for the SAME article.
 * - No current / placeholder image  -> take incoming
 * - Both filenames carry a timestamp -> take the newer upload (prevents reverting
 *   to an older image when one CMS endpoint lags behind another)
 * - Otherwise (no version info)      -> trust the incoming fresh API value
 * Never call this across different articles.
 */
export function pickNewerImageUrl(current?: string | null, incoming?: string | null): string {
  if (isPlaceholderImage(incoming)) return current || incoming || '';
  if (isPlaceholderImage(current)) return incoming as string;
  if (current === incoming) return current as string;
  const tsCurrent = extractImageTimestamp(current);
  const tsIncoming = extractImageTimestamp(incoming);
  if (tsCurrent > 0 && tsIncoming > 0) {
    return tsIncoming >= tsCurrent ? (incoming as string) : (current as string);
  }
  return incoming as string;
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
      title: 'SinPo.id - Matahari Indonesia',
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
  const title = stripHtml(item.judul || item.title || 'SinPo.id - Matahari Indonesia');
  
  // Category / Channel resolution
  const channelName = item.datachannel?.nama || item.kanal?.nama || item.channel?.name || '';
  const categoryNameRaw = item.datakategori?.nama || item.kategori?.nama || item.category?.name || channelName || 'NASIONAL';
  const categoryName = stripHtml(categoryNameRaw).toUpperCase() || 'NASIONAL';

  // Image resolution
  const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.image_url || item.foto || '';
  const imageUrl = getStorageUrl(rawImage);

  // Author / Wartawan resolution from api.sinpo.id
  let authorName = '';
  if (item.datawartawan?.nama_wartawan) {
    authorName = stripHtml(item.datawartawan.nama_wartawan);
  } else if (item.penulis) {
    authorName = typeof item.penulis === 'object' ? stripHtml(item.penulis.nama_wartawan || item.penulis.nama || item.penulis.name || '') : stripHtml(item.penulis);
  } else if (item.wartawan) {
    authorName = typeof item.wartawan === 'object' ? stripHtml(item.wartawan.nama_wartawan || item.wartawan.nama || item.wartawan.name || '') : stripHtml(item.wartawan);
  } else if (item.author) {
    authorName = typeof item.author === 'object' ? stripHtml(item.author.nama_wartawan || item.author.name || item.author.nama || '') : stripHtml(item.author);
  } else if (item.reporter) {
    authorName = typeof item.reporter === 'object' ? stripHtml(item.reporter.nama_wartawan || item.reporter.name || item.reporter.nama || '') : stripHtml(item.reporter);
  } else if (item.editor) {
    authorName = typeof item.editor === 'object' ? stripHtml(item.editor.nama || item.editor.name || '') : stripHtml(item.editor);
  } else if (item.user) {
    authorName = typeof item.user === 'object' ? stripHtml(item.user.name || item.user.nama || '') : stripHtml(item.user);
  }
  authorName = authorName.replace(/\u00a0/g, ' ').replace(/^by\s+/i, '').trim();
  if (!authorName || authorName.length < 2) authorName = 'Redaksi SinPo';

  // Summary & Content resolution
  const rawContent = fixContentImages(item.isi || item.content || '');
  const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || '';
  const dedicatedSummary = stripHtml(rawSummary).trim();
  const fallbackSummary = rawContent ? stripHtml(rawContent).slice(0, 180) : '';
  const cleanSummary = dedicatedSummary || fallbackSummary;

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

  // Gallery images resolution (for GALERI / FOTO category multi-image slider)
  let galleryImages: string[] = [];
  const rawGallery = item.datagallery || item.datagambar || item.galeri || item.images || item.photos || [];
  if (Array.isArray(rawGallery) && rawGallery.length > 0) {
    galleryImages = rawGallery.map((g: any) => {
      if (typeof g === 'string') return getStorageUrl(g);
      const photoPath = g.nama_photo || g.foto || g.gambar || g.photo || g.url || g.image || '';
      return getStorageUrl(photoPath);
    }).filter(Boolean);
  }

  return {
    id: `laravel-${rawId}`,
    slug: item.slug || '',
    title,
    subtitle: dedicatedSummary,
    summary: cleanSummary,
    content: rawContent,
    category: categoryName,
    imageUrl,
    galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
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
    rawId: extractNumericArticleId(rawId),
    publish: item.publish !== undefined && item.publish !== null ? String(item.publish) : '1',
    status: item.status !== undefined && item.status !== null ? String(item.status) : '1',
  };
}
