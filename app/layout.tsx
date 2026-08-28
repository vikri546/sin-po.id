import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sinpo.id'),
  title: {
    default: 'SinPo.id - Matahari Indonesia',
    template: '%s – SinPo.id',
  },
  description: 'SinPo.id adalah portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari seluruh Indonesia secara tajam dan berimbang.',
  keywords: [
    'SinPo.id',
    'SinPo',
    'Matahari Indonesia',
    'Berita Politik',
    'Berita Hukum',
    'Berita Ekbis',
    'Peristiwa',
    'Galeri Foto',
    'Gaya Hidup',
    'Portal Berita Terpercaya',
  ],
  authors: [{ name: 'Redaksi SinPo.id', url: 'https://sinpo.id' }],
  publisher: 'PT Sinpo Media Utama',
  category: 'News & Media',
  alternates: {
    canonical: 'https://sinpo.id',
  },
  openGraph: {
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
    url: 'https://sinpo.id',
    siteName: 'SinPo.id',
    images: [
      {
        url: 'https://sinpo.id/sinpo-favicon.png',
        width: 512,
        height: 512,
        alt: 'SinPo.id Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
    images: ['https://sinpo.id/sinpo-favicon.png'],
  },
  icons: {
    icon: [
      { url: '/sinpo-favicon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/sinpo-favicon.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/sinpo-favicon.png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/sinpo-favicon.png',
      },
    ],
  },
};

const jsonLdWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SinPo.id',
  alternateName: 'SinPo.id - Matahari Indonesia',
  url: 'https://sinpo.id',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://sinpo.id/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'SinPo.id',
  legalName: 'PT Sinpo Media Utama',
  url: 'https://sinpo.id',
  logo: 'https://sinpo.id/sinpo-favicon.png',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Gedung Senatama, Lt.3, Jln. Kramat Kwitang No. 8',
    addressLocality: 'Kwitang, Senen, Jakarta Pusat',
    addressRegion: 'DKI Jakarta',
    postalCode: '10420',
    addressCountry: 'ID',
  },
};

const jsonLdSitelinks = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: [
    {
      '@type': 'SiteNavigationElement',
      position: 1,
      name: 'Tentang Kami',
      description: 'SinPo.id merupakan portal berita politik nasional terpercaya yang menyajikan informasi terkini, independen, dan berintegritas tinggi.',
      url: 'https://sinpo.id/halaman/10/tentang-kami',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 2,
      name: 'Politik',
      description: 'Berita Politik Terkini & Parlemen - Kabar berita politik nasional, kebijakan pemerintah, isu DPR/MPR, dan dinamika politik Indonesia terbaru di SinPo.id.',
      url: 'https://sinpo.id/kanal/politik',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 3,
      name: 'Redaksi',
      description: 'Susunan Redaksi & Manajemen Jurnalistik SinPo.id - Jajaran editor, jurnalis profesional, dan pengelola berita Matahari Indonesia.',
      url: 'https://sinpo.id/halaman/11/redaksi',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 4,
      name: 'GALERI',
      description: 'Galeri Foto Berita & Peristiwa Terkini - Koleksi dokumentasi foto jurnalistik terbaik dan visualisasi peristiwa penting tanah air di SinPo.id.',
      url: 'https://sinpo.id/kanal/galeri',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 5,
      name: 'Gaya Hidup',
      description: 'Berita Gaya Hidup, Tren & Budaya - Seputar kesehatan, kuliner, travel, hiburan, dan gaya hidup terkini di SinPo.id.',
      url: 'https://sinpo.id/kanal/gaya-hidup',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 6,
      name: 'Hukum',
      description: 'Berita Hukum & Kriminalitas Terkini - Mengulas isu hukum, persidangan, kejaksaan, kepolisian, dan keadilan di Indonesia di SinPo.id.',
      url: 'https://sinpo.id/kanal/hukum',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" href="/sinpo-favicon.png" />
        <link rel="shortcut icon" href="/sinpo-favicon.png" type="image/png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/sinpo-favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSitelinks) }}
        />
      </head>
      <body className="antialiased selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
