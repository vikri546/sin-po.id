import { generateRssXml } from '@/lib/rssGenerator';

export async function GET() {
  const xml = await generateRssXml({
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik, hukum, ekonomi, peristiwa, dan terkini Indonesia dari SinPo.id Matahari Indonesia.',
    feedUrl: 'https://sinpo.id/feed.xml',
    limit: 50,
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
