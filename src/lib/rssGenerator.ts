/**
 * RSS 2.0 Feed Generator Utility for SinPo.id
 * Produces valid RSS XML feeds for Home, Category/Kanal, and Single Post detail routes.
 */

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
  limit?: number;
}

function cleanCdata(text: string | null | undefined): string {
  if (!text) return '';
  // Strip non-printable XML control characters and escape CDATA closing tags
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\]\]>/g, ']]&gt;');
}

function resolveChannelId(categoryName: string): string | number {
  const cat = categoryName.toUpperCase().trim();
  if (cat === 'GAYA HIDUP' || cat === 'GAYAHIDUP' || cat === 'GAYA-HIDUP' || cat === 'LIFESTYLE') return 17;
  if (cat === 'GALERI') return 15;
  if (cat === 'BONGKAR') return 21;
  if (cat === 'BUDAYA') return 22;
  if (cat === 'DUNIA') return 18;
  if (cat === 'PENDIDIKAN') return 23;
  if (cat === 'SIN PO DULU' || cat === 'SINPO DULU' || cat === 'SIN-PO-DULU') return 24;
  if (cat === 'OLAHRAGA') return 25;
  if (cat === 'KESEHATAN') return 26;
  if (cat === 'SIN PO TV' || cat === 'SINPO TV' || cat === 'POJOK SINPO') return 27;
  return categoryName.toLowerCase().trim();
}

function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRfc822Date(dateString: string | null | undefined): string {
  if (!dateString) return new Date().toUTCString();
  try {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toUTCString();
    }
  } catch (e) {
    // Fallback
  }
  return new Date().toUTCString();
}

function resolveImageUrl(item: any): string {
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
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
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
}): Promise<any[]> {
  const limit = options.limit || 50;

  try {
    if (options.articleId) {
      const res = await fetch(`${API_BASE_URL}/berita/${options.articleId}`, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: 'application/json',
        },
        next: { revalidate: 300 },
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
    if (options.channel) {
      const channelParam = resolveChannelId(String(options.channel));
      url = `${API_BASE_URL}/berita?channel=${encodeURIComponent(String(channelParam))}&limit=${limit}&sort=desc`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      } else if (Array.isArray(json)) {
        return json;
      }
    }
  } catch (err) {
    console.warn('RSS Feed fetch error:', err);
  }

  return [];
}

function resolveAuthorName(item: any): string {
  let authorName = '';
  if (item.datawartawan?.nama_wartawan) {
    authorName = stripHtmlTags(item.datawartawan.nama_wartawan);
  } else if (item.penulis) {
    authorName = typeof item.penulis === 'object' ? stripHtmlTags(item.penulis.nama_wartawan || item.penulis.nama || item.penulis.name || '') : stripHtmlTags(String(item.penulis));
  } else if (item.wartawan) {
    authorName = typeof item.wartawan === 'object' ? stripHtmlTags(item.wartawan.nama_wartawan || item.wartawan.nama || item.wartawan.name || '') : stripHtmlTags(String(item.wartawan));
  } else if (item.author) {
    authorName = typeof item.author === 'object' ? stripHtmlTags(item.author.nama_wartawan || item.author.name || item.author.nama || '') : stripHtmlTags(String(item.author));
  } else if (item.reporter) {
    authorName = typeof item.reporter === 'object' ? stripHtmlTags(item.reporter.nama_wartawan || item.reporter.name || item.reporter.nama || '') : stripHtmlTags(String(item.reporter));
  } else if (item.editor) {
    authorName = typeof item.editor === 'object' ? stripHtmlTags(item.editor.nama || item.editor.name || '') : stripHtmlTags(String(item.editor));
  } else if (item.user) {
    authorName = typeof item.user === 'object' ? stripHtmlTags(item.user.name || item.user.nama || '') : stripHtmlTags(String(item.user));
  }
  authorName = authorName.replace(/\u00a0/g, ' ').replace(/^by\s+/i, '').trim();
  if (!authorName || authorName.length < 2) authorName = 'Redaksi SinPo';
  return authorName;
}

function fixContentImages(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<img([^>]+)src=["']([^"']+)["']/gi, (match, attrs, src) => {
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
  let cat =
    item.datachannel?.nama_channel ||
    item.datachannel?.nama ||
    item.datakategori?.nama ||
    item.kategori?.nama ||
    (typeof item.category === 'object' ? item.category?.name || item.category?.nama : item.category) ||
    (typeof item.kanal === 'object' ? item.kanal?.name || item.kanal?.nama : item.kanal) ||
    (typeof item.channel === 'object' ? item.channel?.name || item.channel?.nama : item.channel) ||
    fallback ||
    'BERITA';

  return stripHtmlTags(String(cat)).toUpperCase().trim() || 'BERITA';
}

export async function generateRssXml(options: RssFeedOptions = {}): Promise<string> {
  const feedTitle = options.title || 'SinPo.id - Matahari Indonesia';
  const feedDescription =
    options.description ||
    'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.';
  const feedUrl = options.feedUrl || `${SITE_BASE_URL}/feed`;
  const siteUrl = options.siteUrl || SITE_BASE_URL;

  const rawArticles = await fetchRawArticles({
    limit: options.limit || 50,
    channel: options.channelId || options.category,
    articleId: options.articleId,
  });

  const nowRfc = new Date().toUTCString();

  const itemsXml = rawArticles
    .map((item) => {
      const id = item.id || item.id_berita || '0';
      const slug = item.slug || item.title_slug || 'berita';
      const itemTitle = item.title || item.judul || 'Berita SinPo.id';
      const itemLink = `${SITE_BASE_URL}/detail/${id}/${slug}`;
      const pubDate = formatRfc822Date(item.tanggal_tayang || item.created_at || item.created_date);
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
}
