import { generateRssXml } from '@/lib/rssGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const xml = await generateRssXml({
      title: 'SinPo.id - Matahari Indonesia',
      description: 'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.',
      feedUrl: 'https://sinpo.id/feed',
      limit: 50,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error in GET /feed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
