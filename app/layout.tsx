import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SinPo.id - Matahari Indonesia',
  description: 'Portal berita terkini, politik, hukum, ekonomi, dan informasi terpercaya dari Indonesia.',
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
      </head>
      <body className="antialiased selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
