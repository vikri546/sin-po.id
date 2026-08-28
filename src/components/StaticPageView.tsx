"use client";

import React, { useEffect, useState } from 'react';
import { FileText, Building2, ShieldCheck, Mail, Info, Scale, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { formatArticleHtml } from '../lib/htmlRenderer';
import Skeleton from './skeletons/Skeleton';

interface StaticPageViewProps {
  slug: string;
  isLoading?: boolean;
  onNavigateHome?: () => void;
}

// Numeric ID mapping matching CMS backend channel API endpoints
const STATIC_ID_MAP: Record<string, number> = {
  'tentang-kami': 10,
  'redaksi': 11,
  'hak-jawab': 8,
  'hubungi-kami': 9,
  'kontak-kami': 9,
  'kontak': 9,
  'kebijakan-privasi': 14,
  'privacy-policy': 14,
  'syarat-dan-ketentuan': 14,
  'pedoman-siber': 13,
  'pedoman-pemberitaan-media-siber': 13,
};

const STATIC_TITLE_MAP: Record<string, { title: string; icon: any }> = {
  'tentang-kami': { title: 'TENTANG KAMI', icon: Building2 },
  'redaksi': { title: 'SUSUNAN REDAKSI', icon: FileText },
  'hak-jawab': { title: 'LAYANAN HAK JAWAB & KOREKSI', icon: Scale },
  'hubungi-kami': { title: 'HUBUNGI KAMI & MANAJEMEN', icon: Mail },
  'kontak-kami': { title: 'HUBUNGI KAMI & MANAJEMEN', icon: Mail },
  'kebijakan-privasi': { title: 'KEBIJAKAN PRIVASI', icon: ShieldCheck },
  'privacy-policy': { title: 'KEBIJAKAN PRIVASI', icon: ShieldCheck },
  'pedoman-siber': { title: 'PEDOMAN PEMBERITAAN MEDIA SIBER', icon: Info },
  'pedoman-pemberitaan-media-siber': { title: 'PEDOMAN PEMBERITAAN MEDIA SIBER', icon: Info },
};

const STATIC_FALLBACKS: Record<string, { title: string; content: string }> = {
  'tentang-kami': {
    title: 'Tentang SinPo.id',
    content: `
      <p><strong>SinPo.id</strong> (PT Catra Media Nusantara) adalah portal berita nasional independen yang menyajikan informasi terkini, aktual, dan terpercaya dari seluruh pelosok Tanah Air.</p>
      <p>Mengusung motto <em>"Suara Independen, Fakta Tanpa Kompromi"</em>, SinPo.id berdedikasi mengabarkan peristiwa penting mengenai Politik, Hukum, Ekonomi, Peristiwa Nasional, hingga Investigasi Khusus BONGKAR dan Kilas Sejarah SIN PO DULU.</p>
      <p>Setiap karya jurnalistik di SinPo.id diproduksi dengan integritas tinggi serta tunduk sepenuhnya pada Kode Etik Jurnalistik (KEJ) dan Undang-Undang Nomor 40 Tahun 1999 tentang Pers.</p>
      <hr />
      <h3>Visi & Misi</h3>
      <ul>
        <li><strong>Visi:</strong> Menjadi portal media siber terdepan yang mendidik, menginspirasi, serta memperkuat kebebasan pers yang bertanggung jawab di Indonesia.</li>
        <li><strong>Misi:</strong> Menyampaikan fakta berita secara akurat, obyektif, seimbang, dan mengedepankan verifikasi mendalam tanpa kompromi.</li>
      </ul>
    `
  },
  'redaksi': {
    title: 'Susunan Redaksi SinPo.id',
    content: `
      <h3>PT CATRA MEDIA NUSANTARA</h3>
      <p><strong>Penanggung Jawab / Pemimpin Redaksi:</strong> Budi Santoso</p>
      <p><strong>Pemimpin Perusahaan:</strong> PT Catra Media Nusantara</p>
      <p><strong>Redaktur Pelaksana:</strong> Ahmad Hidayat</p>
      <p><strong>Redaktur Senior:</strong> Siti Rahmawati, Rian Hidayat</p>
      <p><strong>Tim Investigasi BONGKAR:</strong> Hendra Wijaya, Dian Lestari</p>
      <p><strong>Tim Liputan & Reporter:</strong> Tim Jurnalistik SinPo Media Jakarta</p>
      <p><strong>Sekretaris Redaksi & IT Support:</strong> Divisi Digital SinPo Media</p>
      <hr />
      <p><em>Alamat Redaksi: Gedung Sin Po Media, Lt. 3, Jakarta Selatan, DKI Jakarta 12190</em></p>
    `
  },
  'hak-jawab': {
    title: 'Pedoman Hak Jawab, Hak Koreksi & Ralat Berita',
    content: `
      <p><strong>SinPo.id</strong> menjunjung tinggi hak masyarakat atas informasi yang akurat dan seimbang. Sesuai Undang-Undang No. 40 Tahun 1999 tentang Pers dan Kode Etik Jurnalistik Dewan Pers, kami melayani permintaan <strong>Hak Jawab, Hak Koreksi, serta Ralat Kekeliruan Berita</strong>.</p>
      <h3>Prosedur Pengajuan Hak Jawab & Koreksi:</h3>
      <ol>
        <li>Pengajuan disampaikan secara tertulis melalui email resmi: <strong>redaksi@sinpo.id</strong> dengan subjek <code>[HAK JAWAB / KOREKSI] - Judul Artikel</code>.</li>
        <li>Melampirkan fotokopi/scan kartu identitas resmi pengaju (KTP/SIM/Paspor).</li>
        <li>Menyertakan bagian berita yang disanggah beserta bukti pendukung atau fakta pembanding yang sah.</li>
      </ol>
      <p>Redaksi SinPo.id akan memproses dan mempublikasikan hak jawab atau hak koreksi secara proposional dalam waktu selambat-lambatnya 2x24 jam setelah verifikasi dokumen dinyatakan lengkap.</p>
    `
  },
  'hubungi-kami': {
    title: 'Hubungi Redaksi & Manajemen SinPo.id',
    content: `
      <p>Kami menyambut baik pertanyaan, masukan, kerja sama iklan, maupun pengiriman siaran pers (press release) dari instansi, lembaga, dan masyarakat.</p>
      <hr />
      <h3>Kontak Resmi Redaksi & Manajemen:</h3>
      <p><strong>Alamat Kantor Redaksi:</strong><br />Gedung Sin Po Media, Lt. 3, Jakarta Selatan, DKI Jakarta 12190</p>
      <p><strong>Email Redaksi & Press Release:</strong><br />redaksi@sinpo.id</p>
      <p><strong>Email Kerja Sama & Iklan:</strong><br />iklan@sinpo.id</p>
      <p><strong>Telepon / Layanan Pengaduan:</strong><br />+62 812-3456-7890 (Hari Kerja 09.00 - 17.00 WIB)</p>
    `
  },
  'kebijakan-privasi': {
    title: 'Kebijakan Privasi Pengguna',
    content: `
      <p>Kebijakan Privasi ini menerangkan bagaimana <strong>SinPo.id</strong> mengumpulkan, mengelola, dan melindungi data pribadi pengunjung saat mengakses situs web kami.</p>
      <h3>1. Pengumpulan Informasi</h3>
      <p>Kami mengumpulkan informasi non-pribadi secara otomatis (seperti alamat IP, jenis peramban, dan halaman yang dikunjungi) untuk keperluan analitis dan pengoptimalan performa situs.</p>
      <h3>2. Penggunaan Data</h3>
      <p>Data pengguna hanya digunakan untuk meningkatkan pengalaman membaca, menyajikan konten relevan, serta respons atas komentar atau pertanyaan pengguna.</p>
      <h3>3. Perlindungan Privasi</h3>
      <p>SinPo.id tidak pernah memperjualbelikan atau memberikan informasi pribadi pengguna kepada pihak ketiga tanpa persetujuan eksplisit, kecuali diharuskan oleh ketentuan hukum yang berlaku di Indonesia.</p>
    `
  },
  'pedoman-siber': {
    title: 'Pedoman Pemberitaan Media Siber',
    content: `
      <p>Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB.</p>
      <p><strong>SinPo.id</strong> mengadopsi penuh <strong>Pedoman Pemberitaan Media Siber</strong> yang ditetapkan oleh Dewan Pers meliputi:</p>
      <ul>
        <li><strong>Verifikasi Berita:</strong> Setiap berita harus melalui verifikasi fakta dan konfirmasi kepada pihak-pihak terkait secara adil.</li>
        <li><strong>Ralat & Hak Jawab:</strong> Wajib melayani ralat, koreksi, dan hak jawab secara proposional.</li>
        <li><strong>Isi Buatan Pengguna (User Generated Content):</strong> Mengawasi serta memoderasi kolom komentar agar bebas dari SARA, fitnah, dan ujaran kebencian.</li>
        <li><strong>Hak Cipta:</strong> Menghormati hak cipta pihak lain dan mencantumkan sumber secara jelas.</li>
      </ul>
    `
  }
};

export default function StaticPageView({ slug, isLoading = false, onNavigateHome }: StaticPageViewProps) {
  const [data, setData] = useState<{ title: string; content: string } | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function fetchStaticContent(showLoader: boolean = true) {
      if (showLoader) setIsFetching(true);
      const numericId = STATIC_ID_MAP[slug] || slug;

      try {
        // Try CMS numeric endpoint /statis/{id} matching sinpo 2 with real-time cache busting
        let res = await apiFetch(`/statis/${numericId}`);
        if (!res.success || !res.data) {
          // Fallback to text slug if needed
          res = await apiFetch(`/statis/${slug}`);
        }

        if (isMounted) {
          if (res.success && res.data) {
            const item = res.data;
            const rawContent = item.isi || item.content || item.keterangan || '';
            // Clean bis_size and bis_skin_checked attributes from CKEditor (exact sinpo 2 logic)
            const cleanContent = rawContent
              .replace(/\s*bis_size="[^"]*"/gi, '')
              .replace(/\s*bis_skin_checked="[^"]*"/gi, '');

            setData({
              title: item.judul || item.title || STATIC_TITLE_MAP[slug]?.title || 'Informasi Statis',
              content: cleanContent || STATIC_FALLBACKS[slug]?.content || '',
            });
          } else {
            setData((prev) => prev || STATIC_FALLBACKS[slug] || null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setData((prev) => prev || STATIC_FALLBACKS[slug] || null);
        }
      } finally {
        if (isMounted && showLoader) {
          setTimeout(() => {
            if (isMounted) setIsFetching(false);
          }, 300);
        }
      }
    }

    // Initial fetch on mount / slug change
    fetchStaticContent(true);

    // Real-time auto sync: poll CMS endpoint every 30 seconds for live updates
    const pollInterval = setInterval(() => {
      fetchStaticContent(false);
    }, 30000);

    // Real-time auto sync: refetch when user switches back to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStaticContent(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slug]);

  const headerInfo = STATIC_TITLE_MAP[slug] || { title: 'INFORMASI PERUSAHAAN', icon: FileText };
  const IconComponent = headerInfo.icon;
  const showSkeleton = isLoading || isFetching;
  const isCenteredPage = slug === 'redaksi' || slug === 'hubungi-kami' || slug === 'kontak-kami';

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 md:px-8 py-8 min-h-[60vh] animate-fade-in ${isCenteredPage ? 'text-center' : 'text-left'}`}>
      {showSkeleton ? (
        /* Transparent Skeleton Loading State */
        <div className={`bg-transparent p-0 flex flex-col ${isCenteredPage ? 'items-center text-center' : 'items-start text-left'} justify-start gap-6`}>
          <div className="flex flex-col items-center justify-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5 w-full text-center">
            <Skeleton className="h-8 w-64 md:w-96 rounded-sm" />
          </div>
          <div className={`flex flex-col ${isCenteredPage ? 'items-center' : 'items-start'} gap-4 mt-2 w-full`}>
            <Skeleton className="h-5 w-full rounded-sm" />
            <Skeleton className="h-5 w-11/12 rounded-sm" />
            <Skeleton className="h-5 w-4/5 rounded-sm" />
            <Skeleton className="h-28 w-full rounded-md mt-4" />
            <Skeleton className="h-5 w-full rounded-sm" />
            <Skeleton className="h-5 w-3/4 rounded-sm" />
          </div>
        </div>
      ) : data ? (
        /* Transparent Main Static Page Content */
        <div className="bg-transparent p-0 transition-colors">
          {/* Header Title Section (Centered with horizontal line divider) */}
          <div className="flex flex-col items-center justify-center text-center pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h1 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight uppercase">
              {data.title}
            </h1>
          </div>

          {/* Formatted Content Body (Centered for Redaksi & Hubungi Kami, Left aligned for others) */}
          <div
            className={`article-content font-sans text-sm sm:text-base md:text-lg text-slate-800 dark:text-slate-200 leading-relaxed tracking-wide space-y-4 ${
              isCenteredPage 
                ? 'text-center [&_*]:text-center [&_ul]:list-none [&_ol]:list-none' 
                : 'text-left [&_*]:text-left'
            } [&_hr]:my-6 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-800`}
            dangerouslySetInnerHTML={{ __html: formatArticleHtml(data.content) }}
          />
        </div>
      ) : (
        <div className="py-16 text-center bg-transparent">
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            Halaman informasi tidak ditemukan.
          </p>
        </div>
      )}
    </div>
  );
}
