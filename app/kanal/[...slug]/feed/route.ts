import { generateRssXml } from '@/lib/rssGenerator';

export async function GET(
  req: Request,
  props: { params: Promise<{ slug?: string[] }> }
) {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const categorySlug = slugArray.filter((s) => s !== 'feed')[0] || 'berita';
  const categoryName = categorySlug.replace(/-/g, ' ').toUpperCase();

  const xml = await generateRssXml({
    title: `Berita ${categoryName} Terkini - SinPo.id`,
    description: `RSS Feed berita terkini kanal ${categoryName} dari SinPo.id Matahari Indonesia.`,
    feedUrl: `https://sinpo.id/kanal/${categorySlug}/feed`,
    category: categorySlug,
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
