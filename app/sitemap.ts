import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sinpo.id';

  // Static & Main Pages matching CMS channel IDs
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/halaman/10/tentang-kami`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/halaman/11/redaksi`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/halaman/13/pedoman-pemberitaan-media-siber`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/halaman/14/syarat-dan-ketentuan`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/halaman/9/kontak`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Category Pages
  const categories = [
    'politik',
    'hukum',
    'ekbis',
    'peristiwa',
    'galeri',
    'gaya-hidup',
    'sin-po-dulu',
    'opini',
    'nusantara',
    'pendidikan',
    'olahraga',
    'kesehatan',
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/kanal/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  }));

  // Latest Articles from CMS API
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch('https://api.sinpo.id/api/berita?limit=50', {
      headers: {
        Authorization: 'Bearer LMyrBrMUP8zpYV5d',
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        articlePages = json.data.map((item: any) => {
          const slug = item.slug || item.title_slug || 'berita';
          return {
            url: `${baseUrl}/detail/${item.id}/${slug}`,
            lastModified: item.tanggal_tayang ? new Date(item.tanggal_tayang) : new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
          };
        });
      }
    }
  } catch (e) {
    // Fallback during build
  }

  return [...staticPages, ...categoryPages, ...articlePages];
}
