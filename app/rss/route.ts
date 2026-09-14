import { generateRssXml } from '@/lib/rssGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || searchParams.get('category') || undefined;
    const articleId = searchParams.get('articleId') || undefined;
    const tag = searchParams.get('tag') || searchParams.get('tagar') || undefined;

    let title = 'SinPo.id - Matahari Indonesia';
    let description = 'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.';

    if (tag) {
      const cleanTag = tag.replace(/-/g, ' ');
      title = `Berita #${cleanTag} Terkini - SinPo.id`;
      description = `Kumpulan berita terkini dan topik hangat seputar #${cleanTag} di SinPo.id Matahari Indonesia.`;
    } else if (channel) {
      const channelName = channel.replace(/-/g, ' ').toUpperCase();
      title = `Berita ${channelName} Terkini - SinPo.id`;
      description = `Portal berita politik, hukum, ekonomi, peristiwa, dan terkini kanal ${channelName} dari SinPo.id Matahari Indonesia.`;
    }

    const feedUrl = request.url.includes('?')
      ? `https://sinpo.id/rss?${request.url.split('?')[1]}`
      : 'https://sinpo.id/rss';

    const xml = await generateRssXml({
      title,
      description,
      feedUrl,
      category: channel,
      articleId,
      tag,
      limit: articleId ? 1 : 50,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error in GET /rss:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
