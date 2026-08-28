import React from 'react';

interface NotFoundViewProps {
  title?: string;
  message?: string;
  onGoHome?: () => void;
}

/**
 * 404 Not Found page — matching sinpo 2 renderNotFound() UI
 */
export default function NotFoundView({
  title = '404 NOT FOUND',
  message = 'Halaman atau berita yang Anda cari tidak ditemukan.',
  onGoHome,
}: NotFoundViewProps) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center text-center px-5 animate-fade-in"
      style={{ minHeight: '50vh', padding: '100px 20px' }}
    >
      {/* Large 404 heading — matching sinpo 2 error-code style */}
      <h1
        className="font-black uppercase leading-none tracking-wide select-none"
        style={{
          fontSize: 'clamp(48px, 10vw, 72px)',
          color: '#cb1c1d',
          margin: '0 0 16px 0',
          letterSpacing: '1px',
        }}
      >
        {title}
      </h1>

      {/* Error message */}
      <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg mb-8 max-w-md leading-relaxed">
        {message}
      </p>

      {/* Back to homepage button — matching sinpo 2 btn-primary style */}
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="inline-block px-7 py-3 text-white font-semibold text-[15px] rounded-md transition-colors duration-200 hover:opacity-90 cursor-pointer"
          style={{
            backgroundColor: '#cb1c1d',
            textDecoration: 'none',
          }}
        >
          Kembali ke Beranda
        </button>
      )}
    </div>
  );
}
