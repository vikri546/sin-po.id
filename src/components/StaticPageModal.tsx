"use client";

import React, { useEffect, useState } from 'react';
import { X, FileText, Building2, ShieldCheck, Mail, Info, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/apiClient';
import { formatArticleHtml } from '../lib/htmlRenderer';
import Skeleton from './skeletons/Skeleton';

interface StaticPageModalProps {
  slug: string | null;
  onClose: () => void;
}

const STATIC_TITLE_MAP: Record<string, { title: string; icon: any }> = {
  'tentang-kami': { title: 'TENTANG KAMI', icon: Building2 },
  'redaksi': { title: 'SUSUNAN REDAKSI', icon: FileText },
  'hak-jawab': { title: 'LAYANAN HAK JAWAB & KOREKSI', icon: Scale },
  'hubungi-kami': { title: 'HUBUNGI KAMI & MANAJEMEN', icon: Mail },
  'kebijakan-privasi': { title: 'KEBIJAKAN PRIVASI', icon: ShieldCheck },
  'pedoman-siber': { title: 'PEDOMAN PEMBERITAAN MEDIA SIBER', icon: Info },
};

const STATIC_FALLBACKS: Record<string, { title: string; content: string }> = {
  'tentang-kami': {
    title: 'Tentang SinPo.id',
    content: `<p><strong>SinPo.id</strong> adalah portal berita nasional independen di bawah naungan <strong>PT Catra Media Nusantara</strong>. Kami berkomitmen menyajikan informasi aktual, tepercaya, dan mendalam yang berpegang teguh pada kode etik jurnalistik.</p><p>Dengan semangat "Suara Independen, Fakta Tanpa Kompromi", SinPo.id hadir memberikan informasi komprehensif dari sektor Politik, Hukum, Ekonomi, hingga Investigasi Khusus BONGKAR.</p>`
  },
  'redaksi': {
    title: 'Susunan Redaksi SinPo.id',
    content: `<h3>PT CATRA MEDIA NUSANTARA</h3><p><strong>Penanggung Jawab / Pemimpin Redaksi:</strong> Budi Santoso</p><p><strong>Redaktur Pelaksana:</strong> Ahmad Hidayat</p><p><strong>Redaktur Senior:</strong> Siti Rahmawati, Rian Hidayat</p><p><strong>Tim Investigasi BONGKAR:</strong> Hendra Wijaya, Dian Lestari</p><p><strong>Reporter & Fotografer:</strong> Tim Jurnalistik SinPo Media Jakarta</p>`
  },
  'hak-jawab': {
    title: 'Pedoman Hak Jawab & Koreksi Kekeliruan',
    content: `<p>SinPo.id melayani permintaan <strong>Hak Jawab, Hak Koreksi, dan Ralat Berita</strong> sesuai dengan Undang-Undang Nomor 40 Tahun 1999 tentang Pers dan Kode Etik Jurnalistik Dewan Pers.</p><p>Masyarakat atau pihak yang merasa dirugikan oleh pemberitaan dapat mengajukan sanggahan resmi dengan melampirkan identitas serta bukti pendukung ke email: <strong>redaksi@sinpo.id</strong>.</p>`
  },
  'hubungi-kami': {
    title: 'Hubungi Redaksi & Manajemen SinPo.id',
    content: `<p><strong>Alamat Kantor Redaksi:</strong></p><p>Gedung Sin Po Media, Lt. 3, Jakarta Selatan, DKI Jakarta 12190</p><p><strong>Email Redaksi:</strong> redaksi@sinpo.id</p><p><strong>Email Iklan & Kerjasama:</strong> iklan@sinpo.id</p><p><strong>Telepon / WA Redaksi:</strong> +62 812-3456-7890</p>`
  },
  'kebijakan-privasi': {
    title: 'Kebijakan Privasi Pengguna',
    content: `<p>Kebijakan Privasi ini menjelaskan bagaimana <strong>SinPo.id</strong> mengumpulkan, mengelola, dan melindungi data pribadi pengguna saat mengakses layanan situs kami.</p><p>Kami menghormati privasi Anda dan tidak akan menjual atau membagikan informasi pribadi Anda kepada pihak ketiga tanpa persetujuan eksplisit, kecuali diwajibkan oleh hukum yang berlaku.</p>`
  },
  'pedoman-siber': {
    title: 'Pedoman Pemberitaan Media Siber',
    content: `<p>Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB.</p><p>SinPo.id mengadopsi penuh <strong>Pedoman Pemberitaan Media Siber</strong> yang ditetapkan Dewan Pers dalam setiap proses verifikasi, hak cipta, dan publikasi konten digital.</p>`
  }
};

export default function StaticPageModal({ slug, onClose }: StaticPageModalProps) {
  const [data, setData] = useState<{ title: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }

    const currentSlug = slug;
    document.body.style.overflow = 'hidden';
    setIsLoading(true);

    async function fetchStaticContent() {
      try {
        const res = await apiFetch(`/statis/${currentSlug}`);
        if (res.success && res.data) {
          const item = res.data;
          setData({
            title: item.judul || item.title || STATIC_TITLE_MAP[currentSlug]?.title || 'Informasi Statis',
            content: item.isi || item.content || item.keterangan || '',
          });
        } else {
          setData(STATIC_FALLBACKS[currentSlug] || null);
        }
      } catch (err) {
        console.log(`Static page API /statis/${currentSlug} fallback to local template`);
        setData(STATIC_FALLBACKS[currentSlug] || null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStaticContent();

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [slug]);

  if (!slug) return null;

  const headerInfo = STATIC_TITLE_MAP[slug] || { title: 'INFORMASI', icon: FileText };
  const IconComponent = headerInfo.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-950 rounded-[8px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <IconComponent className="h-5 w-5 text-brand-red-600 dark:text-brand-red-500 shrink-0" />
              <h3 className="font-sans text-sm md:text-base font-extrabold tracking-wider text-slate-900 dark:text-white uppercase">
                {headerInfo.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-3/4 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-4/5 rounded-sm" />
                <Skeleton className="h-24 w-full rounded-sm" />
              </div>
            ) : data ? (
              <div className="flex flex-col gap-4">
                <h2 className="font-sans text-xl md:text-2xl font-bold text-slate-950 dark:text-white border-b border-slate-100 dark:border-slate-900 pb-3">
                  {data.title}
                </h2>
                <div
                  className="article-content font-sans text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatArticleHtml(data.content) }}
                />
              </div>
            ) : (
              <p className="text-sm font-sans text-slate-500 italic">
                Informasi tidak ditemukan.
              </p>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-sans shrink-0">
            <span>SinPo.id Media Digital Indonesia</span>
            <button
              onClick={onClose}
              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white px-4 py-1.5 rounded-[4px] font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
