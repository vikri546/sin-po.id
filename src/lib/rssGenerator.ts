/**
 * RSS 2.0 Feed Generator Utility for SinPo.id
 * Produces valid RSS XML feeds for Home, Category/Kanal, and Single Post detail routes.
 */

import { isTakedownArticle } from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.sinpo.id/api';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';
const SITE_BASE_URL = 'https://sinpo.id';

export interface RssFeedOptions {
  title?: string;
  description?: string;
  feedUrl?: string;
  siteUrl?: string;
  category?: string;
  channelId?: string | number;
  articleId?: string | number;
  tag?: string;
  limit?: number;
}

function cleanCdata(text: any): string {
  if (text === null || text === undefined) return '';
  const str = typeof text === 'string' ? text : String(text);
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\]\]>/g, ']]&gt;');
}

function resolveChannelId(categoryName: string): string | number {
  const cat = String(categoryName || '').toUpperCase().trim();
  if (cat === 'POLITIK') return 2;
  if (cat === 'HUKUM') return 3;
  if (cat === 'OPINI') return 4;
  if (cat === 'EKBIS' || cat === 'EKONOMI' || cat === 'EKONOMI & BISNIS' || cat === 'EKONOMI-BISNIS') return 5;
  if (cat === 'PERISTIWA' || cat === 'NASIONAL') return 6;
  if (cat === 'GALERI') return 15;
  if (cat === 'GAYA HIDUP' || cat === 'GAYAHIDUP' || cat === 'GAYA-HIDUP' || cat === 'LIFESTYLE') return 17;
  if (cat === 'DUNIA' || cat === 'INTERNASIONAL') return 18;
  if (cat === 'BONGKAR') return 21;
  if (cat === 'BUDAYA') return 22;
  if (cat === 'PENDIDIKAN') return 23;
  if (cat === 'SIN PO DULU' || cat === 'SINPO DULU' || cat === 'SIN-PO-DULU') return 24;
  if (cat === 'OLAHRAGA' || cat === 'SPORT') return 25;
  if (cat === 'KESEHATAN') return 26;
  if (cat === 'SIN PO TV' || cat === 'SINPO TV' || cat === 'POJOK SINPO') return 27;
  return categoryName.toLowerCase().trim();
}

function stripHtmlTags(html: any): string {
  if (!html) return '';
  const str = typeof html === 'string' ? html : String(html);
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRfc822Date(dateString?: string | null, timeString?: string | null): string {
  if (!dateString) return new Date().toUTCString();
  try {
    let datePart = String(dateString).trim();
    if (datePart.includes('T')) {
      datePart = datePart.split('T')[0];
    } else if (datePart.includes(' ')) {
      datePart = datePart.split(' ')[0];
    }

    let timePart = '00:00:00';
    if (timeString && typeof timeString === 'string' && timeString.trim() !== '') {
      timePart = timeString.trim();
      if (timePart.length === 5) timePart += ':00';
    } else if (String(dateString).includes('T')) {
      const rawT = String(dateString).split('T')[1]?.replace('.000000Z', '')?.replace('Z', '');
      if (rawT && rawT !== '00:00:00') {
        timePart = rawT;
      }
    }

    const isoString = `${datePart}T${timePart}+07:00`;
    const parsed = new Date(isoString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toUTCString();
    }
  } catch (e) {
    // Fallback below
  }
  
  try {
    const directParsed = new Date(dateString);
    if (!isNaN(directParsed.getTime())) {
      return directParsed.toUTCString();
    }
  } catch (e) {
    // Fallback below
  }

  return new Date().toUTCString();
}

function resolveImageUrl(item: any): string {
  if (!item || typeof item !== 'object') return `${SITE_BASE_URL}/sinpo-og-banner.png`;

  const rawImage =
    item.gambar_detail ||
    item.gambar ||
    item.image ||
    item.foto ||
    item.picture ||
    item.cover ||
    item.thumbnail ||
    item.image_url ||
    item.cover_url ||
    '';

  if (!rawImage) return `${SITE_BASE_URL}/sinpo-og-banner.png`;

  let cleanPath = String(rawImage).trim();
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  if (
    cleanPath.startsWith('storage/') ||
    cleanPath.startsWith('uploads/') ||
    cleanPath.startsWith('gambar/') ||
    cleanPath.startsWith('foto/') ||
    cleanPath.startsWith('asset/') ||
    cleanPath.startsWith('assets/')
  ) {
    return `${SITE_BASE_URL}/${cleanPath}`;
  }

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

function resolveImageMimeType(url: string): string {
  const ext = String(url || '').split('.').pop()?.toLowerCase().split('?')[0] || '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
}

export async function fetchRawArticles(options: {
  limit?: number;
  channel?: string | number;
  articleId?: string | number;
  tag?: string;
}): Promise<any[]> {
  const limit = options.limit || 50;

  try {
    if (options.articleId) {
      const res = await fetch(`${API_BASE_URL}/berita/${options.articleId}`, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: 'application/json',
        },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.data || json.berita || json;
        if (item && typeof item === 'object') {
          return [item];
        }
      }
      return [];
    }

    let url = `${API_BASE_URL}/berita?limit=${limit}&sort=desc`;
    if (options.tag) {
      url = `${API_BASE_URL}/berita?tag=${encodeURIComponent(String(options.tag))}&limit=${limit}&sort=desc`;
    } else if (options.channel) {
      const channelParam = resolveChannelId(String(options.channel));
      url = `${API_BASE_URL}/berita?channel=${encodeURIComponent(String(channelParam))}&limit=${limit}&sort=desc`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      let articles: any[] = [];
      if (json.success && Array.isArray(json.data)) {
        articles = json.data;
      } else if (Array.isArray(json)) {
        articles = json;
      }
      
      let filtered = articles.filter((item) => !isTakedownArticle(item));
      if (options.tag) {
        const cleanTag = String(options.tag).toLowerCase().replace(/-/g, ' ').trim();
        filtered = filtered.filter((item) => {
          const itemTag = String(item.tag || item.tags || '').toLowerCase();
          return itemTag.includes(cleanTag);
        });
      }
      return filtered;
    }
  } catch (err) {
    console.warn('RSS Feed fetch error:', err);
  }

  return [];
}

function resolveAuthorName(item: any): string {
  if (!item || typeof item !== 'object') return 'Redaksi SinPo';

  let raw: any = null;
  if (item.datawartawan && typeof item.datawartawan === 'object') {
    raw = item.datawartawan.nama_wartawan || item.datawartawan.nama || item.datawartawan.name;
  }
  if (!raw && item.penulis) {
    raw = typeof item.penulis === 'object' ? (item.penulis.nama_wartawan || item.penulis.nama || item.penulis.name) : item.penulis;
  }
  if (!raw && item.wartawan) {
    raw = typeof item.wartawan === 'object' ? (item.wartawan.nama_wartawan || item.wartawan.nama || item.wartawan.name) : item.wartawan;
  }
  if (!raw && item.author) {
    raw = typeof item.author === 'object' ? (item.author.nama_wartawan || item.author.name || item.author.nama) : item.author;
  }
  if (!raw && item.reporter) {
    raw = typeof item.reporter === 'object' ? (item.reporter.nama_wartawan || item.reporter.name || item.reporter.nama) : item.reporter;
  }
  if (!raw && item.editor) {
    raw = typeof item.editor === 'object' ? (item.editor.nama || item.editor.name) : item.editor;
  }
  if (!raw && item.user) {
    raw = typeof item.user === 'object' ? (item.user.name || item.user.nama) : item.user;
  }

  let authorName = stripHtmlTags(raw);
  authorName = authorName.replace(/\u00a0/g, ' ').replace(/^by\s+/i, '').trim();
  if (!authorName || authorName.length < 2) authorName = 'Redaksi SinPo';
  return authorName;
}

function fixContentImages(html?: string | null): string {
  if (!html) return '';
  const str = typeof html === 'string' ? html : String(html);
  return str.replace(/<img([^>]+)src=["']([^"']+)["']/gi, (match, attrs, src) => {
    if (!src || src.startsWith('data:')) return match;
    let cleanSrc = src.trim();
    if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) return match;
    if (cleanSrc.startsWith('/')) {
      cleanSrc = cleanSrc.substring(1);
    }
    return `<img${attrs}src="https://sinpo.id/storage/${cleanSrc}"`;
  });
}

function resolveCategoryName(item: any, fallback?: string): string {
  if (!item || typeof item !== 'object') return fallback ? String(fallback).toUpperCase() : 'BERITA';

  let rawCat: any = null;
  if (item.datachannel && typeof item.datachannel === 'object') {
    rawCat = item.datachannel.nama_channel || item.datachannel.nama;
  }
  if (!rawCat && item.datakategori && typeof item.datakategori === 'object') {
    rawCat = item.datakategori.nama;
  }
  if (!rawCat && item.kategori) {
    rawCat = typeof item.kategori === 'object' ? item.kategori.nama || item.kategori.name : item.kategori;
  }
  if (!rawCat && item.category) {
    rawCat = typeof item.category === 'object' ? item.category.name || item.category.nama : item.category;
  }
  if (!rawCat && item.kanal) {
    rawCat = typeof item.kanal === 'object' ? item.kanal.name || item.kanal.nama : item.kanal;
  }
  if (!rawCat && item.channel) {
    rawCat = typeof item.channel === 'object' ? item.channel.name || item.channel.nama : item.channel;
  }

  const catStr = stripHtmlTags(rawCat || fallback || 'BERITA').toUpperCase().trim();
  return catStr || 'BERITA';
}

export async function generateRssXml(options: RssFeedOptions = {}): Promise<string> {
  const feedTitle = options.title || 'SinPo.id - Matahari Indonesia';
  const feedDescription =
    options.description ||
    'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.';
  const feedUrl = options.feedUrl || `${SITE_BASE_URL}/rss`;
  const siteUrl = options.siteUrl || SITE_BASE_URL;

  try {
    const rawArticles = await fetchRawArticles({
      limit: options.limit || 50,
      channel: options.channelId || options.category,
      articleId: options.articleId,
      tag: options.tag,
    });

    const nowRfc = new Date().toUTCString();

    const itemsXml = (rawArticles || [])
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const id = item.id || item.id_berita || '0';
        const slug = item.slug || item.title_slug || 'berita';
        const itemTitle = item.title || item.judul || 'Berita SinPo.id';
        const itemLink = `${SITE_BASE_URL}/detail/${id}/${slug}`;
        const pubDate = formatRfc822Date(
          item.tanggal_tayang || item.published_at || item.created_at || item.created_date,
          item.waktu
        );
        const author = resolveAuthorName(item);
        const category = resolveCategoryName(item, options.category);

        const rawContent = fixContentImages(item.content || item.isi || item.summary || item.ringkasan || '');
        const cleanSummary = item.summary || item.ringkasan || stripHtmlTags(rawContent).slice(0, 300);
        const imageUrl = resolveImageUrl(item);

        return `
    <item>
      <title><![CDATA[${cleanCdata(itemTitle)}]]></title>
      <link>${itemLink}</link>
      <guid isPermaLink="true">${itemLink}</guid>
      <pubDate>${pubDate}</pubDate>
      <author><![CDATA[${cleanCdata(author)}]]></author>
      <category><![CDATA[${cleanCdata(category)}]]></category>
      <description><![CDATA[${cleanCdata(cleanSummary)}]]></description>
      ${rawContent ? `<content:encoded><![CDATA[${cleanCdata(rawContent)}]]></content:encoded>` : ''}
      ${imageUrl ? `<media:content url="${imageUrl}" medium="image" type="${resolveImageMimeType(imageUrl)}" />` : ''}
      ${imageUrl ? `<enclosure url="${imageUrl}" type="${resolveImageMimeType(imageUrl)}" length="0" />` : ''}
    </item>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><![CDATA[${cleanCdata(feedTitle)}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${cleanCdata(feedDescription)}]]></description>
    <language>id-ID</language>
    <lastBuildDate>${nowRfc}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_BASE_URL}/sinpo-favicon.png</url>
      <title>SinPo.id</title>
      <link>${SITE_BASE_URL}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;
  } catch (err) {
    console.error('generateRssXml uncaught error:', err);
    const nowRfc = new Date().toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${cleanCdata(feedTitle)}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${cleanCdata(feedDescription)}]]></description>
    <language>id-ID</language>
    <lastBuildDate>${nowRfc}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
  </channel>
</rss>`;
  }
}
