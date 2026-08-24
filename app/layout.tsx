import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SinPo.id - Matahari Indonesia',
  description: 'Portal berita terkini, politik, hukum, ekonomi, dan informasi terpercaya dari Indonesia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
