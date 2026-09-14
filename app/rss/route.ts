import { generateRssXml } from '@/lib/rssGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || searchParams.get('category') || undefined;
    const articleId = searchParams.get('articleId') || undefined;

    const channelName = channel ? channel.replace(/-/g, ' ').toUpperCase() : undefined;
    const title = channelName
      ? `Berita ${channelName} Terkini - SinPo.id`
      : 'SinPo.id - Matahari Indonesia';
    const description = channelName
      ? `Portal berita politik, hukum, ekonomi, peristiwa, dan terkini kanal ${channelName} dari SinPo.id Matahari Indonesia.`
      : 'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.';

    const feedUrl = request.url.includes('?')
      ? `https://sinpo.id/rss?${request.url.split('?')[1]}`
      : 'https://sinpo.id/rss';

    const xml = await generateRssXml({
      title,
      description,
      feedUrl,
      category: channel,
      articleId,
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
