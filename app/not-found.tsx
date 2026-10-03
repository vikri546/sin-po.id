import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <h1
        className="font-black uppercase leading-none tracking-wide select-none mb-3"
        style={{
          fontSize: 'clamp(64px, 12vw, 96px)',
          color: '#cb1c1d',
          letterSpacing: '1px',
        }}
      >
        404
      </h1>
      <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-base leading-relaxed">
        Maaf, berita atau halaman yang Anda cari tidak ditemukan, telah dihapus, atau belum dipublikasikan.
      </p>
      <Link
        href="/"
        className="px-7 py-3 text-white font-semibold text-[15px] rounded-md transition-opacity duration-200 hover:opacity-90 shadow-md inline-block"
        style={{
          backgroundColor: '#cb1c1d',
          textDecoration: 'none',
        }}
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

