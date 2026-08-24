import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
