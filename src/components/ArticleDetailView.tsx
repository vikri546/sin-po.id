import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Share, Share2, MessageSquare, Calendar, User, Clock, Bookmark, HelpCircle, Trash2, MessageCircle, Facebook, Instagram, Linkedin, ChevronLeft, ChevronRight, Copy, Check, Link, Loader2, X, Play, Pause } from 'lucide-react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';
import { getArticleUrl, getTagUrl, getNumericId } from '@/lib/urlHelpers';

interface ArticleDetailViewProps {
  article: Article;
  onBack: () => void;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onAddComment: (articleId: string, name: string, commentText: string) => void;
  onDeleteComment?: (articleId: string, commentId: string) => void;
  myCommentIds?: string[];
  onShare: (message: string) => void;
  onSelectCategory?: (category: string) => void;
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
  onSelectTag?: (tag: string) => void;
  isLoading?: boolean;
}

import { formatArticleHtml, stripHtml } from '../lib/htmlRenderer';
import { apiFetch, isTakedownArticle, isScheduledArticle, incrementArticleViewCounter, getStorageUrl, pickNewerImageUrl } from '../lib/apiClient';
import { parseAnyDate } from '../lib/dateFormatter';
import NotFoundView from './NotFoundView';

const articleContentMemoryCache = new Map<string, string>();
const articleAudioUrlMemoryCache = new Map<string, string>();

// Cache promise request yang sedang berjalan agar prefetch + fetch di komponen tidak dobel
const articleDetailInflight = new Map<string, Promise<any>>();

const MIN_BODY_TEXT_LENGTH = 80;

const resolveTargetIdOrSlug = (art: Article): string => {
  const rawId = String(art.id || '').replace('laravel-', '');
  const numericId = getNumericId(art.id) || rawId;
  return String(numericId || (art as any).slug || rawId);
};

const fetchDetailShared = (targetIdOrSlug: string): Promise<any> => {
  const existing = articleDetailInflight.get(targetIdOrSlug);
  if (existing) return existing;
  const p = apiFetch(`/berita/${targetIdOrSlug}`).finally(() => {
    articleDetailInflight.delete(targetIdOrSlug);
  });
  articleDetailInflight.set(targetIdOrSlug, p);
  return p;
};

/**
 * OPSIONAL: panggil fungsi ini dari komponen induk (mis. onMouseEnter / onTouchStart pada kartu berita)
 * agar isi berita sudah ter-cache sebelum halaman detail dibuka.
 */
export const prefetchArticleDetail = (art: Article) => {
  if (!art || !art.id || articleContentMemoryCache.has(art.id)) return;
  fetchDetailShared(resolveTargetIdOrSlug(art))
    .then((res: any) => {
      const d = res?.data;
      if (!d) return;
      const content = d.isi || d.content || d.ringkasan || d.excerpt || d.sub_judul || '';
      if (content) articleContentMemoryCache.set(art.id, content);
    })
    .catch(() => {});
};

const getFullBodyFromArticle = (art: Article | null | undefined): string => {
  if (!art) return '';
  if (art.id && articleContentMemoryCache.has(art.id)) {
    return articleContentMemoryCache.get(art.id)!;
  }
  return art.content || (art as any)?.isi || art.summary || art.subtitle || '';
};

const getFallbackBodyFromArticle = (art: Article | null | undefined): string => {
  if (!art) return '';
  return art.content || (art as any)?.isi || art.summary || art.subtitle || '';
};

const hasEnoughBody = (html: string): boolean => stripHtml(html || '').trim().length >= MIN_BODY_TEXT_LENGTH;

const buildInitialContent = (art: Article | null): string => {
  if (!art) return '';
  if (art.id && articleContentMemoryCache.has(art.id)) {
    return articleContentMemoryCache.get(art.id)!;
  }
  const best = getFallbackBodyFromArticle(art);
  const cleanBest = stripHtml(best).trim();
  if (cleanBest.length >= 25) {
    return best;
  }
  const cat = (art.category || 'POLITIK').toUpperCase();
  return `<p><strong>SinPo.id - </strong><sup>${cat}</sup> - ${art.title}. Simak ulasan berita selengkapnya dan informasi terkini perihal ${art.title} selengkapnya di portal berita SinPo.id Matahari Indonesia.</p>`;
};

const calculateSpeechDuration = (title?: string, author?: string, content?: string): number => {
  const safeTitle = title || '';
  const safeAuthor = author || '';
  const safeContent = content || '';
  const text = `${safeTitle}. Ditulis oleh ${safeAuthor}. ${stripHtml(safeContent)}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.round((words / 160) * 60));
};

// Skeleton khusus bagian isi berita
const BodySkeleton = () => (
  <div className="flex flex-col gap-3 py-2" aria-busy="true" aria-label="Memuat isi berita">
    <Skeleton className="h-4 w-full rounded-sm" />
    <Skeleton className="h-4 w-full rounded-sm" />
    <Skeleton className="h-4 w-11/12 rounded-sm" />
    <Skeleton className="h-4 w-4/5 rounded-sm" />
    <div className="my-2" />
    <Skeleton className="h-4 w-full rounded-sm" />
    <Skeleton className="h-4 w-full rounded-sm" />
    <Skeleton className="h-4 w-5/6 rounded-sm" />
    <Skeleton className="h-4 w-full rounded-sm" />
    <div className="my-2" />
    <Skeleton className="h-4 w-full rounded-sm" />
    <Skeleton className="h-4 w-3/4 rounded-sm" />
  </div>
);

export default function ArticleDetailView({
  article,
  onBack,
  bookmarkedIds,
  onToggleBookmark,
  onAddComment,
  onDeleteComment,
  myCommentIds,
  onShare,
  onSelectCategory,
  articles,
  onSelectArticle,
  onSelectTag,
  isLoading = false
}: ArticleDetailViewProps) {
  
  // State Lokal (Local Article) agar Data yang ter-fetch secara otomatis mengganti Skeleton
  const [localArticle, setLocalArticle] = useState<Article>(article);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(() => (article as any).isFallback || article?.title === 'Sedang memuat konten...');

  // Sinkronisasi data ketika prop article di-push oleh navigasi induk
  useEffect(() => {
    setLocalArticle(article);
    setIsFallbackMode((article as any).isFallback || article?.title === 'Sedang memuat konten...');
  }, [article]);

  const isSkeletonMode = isLoading || !localArticle || !localArticle.title || isFallbackMode;

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0); 
  const [speechDuration, setSpeechDuration] = useState(() => calculateSpeechDuration(localArticle?.title, localArticle?.author, localArticle?.content));
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [liveViews, setLiveViews] = useState<number | null>(null);
  const [liveImageUrl, setLiveImageUrl] = useState<string>(localArticle?.imageUrl || '');

  // PERBAIKAN: state awal HANYA berisi konten penuh (cache / content / isi), bukan summary/subtitle.
  // Dengan begitu isi berita tidak "berganti" dari ringkasan ke konten penuh (yang terasa telat).
  const [fullContent, setFullContent] = useState<string>(() => getFullBodyFromArticle(localArticle));
  
  // PERBAIKAN: selama konten penuh belum ada, bagian isi menampilkan skeleton sehingga layout stabil
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(() => !hasEnoughBody(getFullBodyFromArticle(localArticle)));

  // Menandai artikel (id) yang konten penuhnya sudah berhasil diambil dari API,
  // supaya tidak tertimpa kembali oleh data prop yang lebih pendek.
  const fetchedContentIdRef = useRef<string | null>(
    localArticle?.id && articleContentMemoryCache.has(localArticle.id) ? localArticle.id : null
  );

  useEffect(() => {
    if (!localArticle || isSkeletonMode) return;
    const contentToUse = fullContent || getFallbackBodyFromArticle(localArticle);
    const seconds = calculateSpeechDuration(localArticle.title, localArticle.author, contentToUse);
    setSpeechDuration(seconds);
    setSpeechProgress(0);
    setLiveViews(null);
  }, [localArticle, fullContent, isSkeletonMode]);

const ENABLE_TTS = false;

  useEffect(() => {
    if (!ENABLE_TTS || !localArticle?.id || isSkeletonMode) return;
    const contentToUse = fullContent || getFallbackBodyFromArticle(localArticle);
    const textSig = `${localArticle.id}_${contentToUse.length}_${contentToUse.slice(0, 30)}`;
    if (articleAudioUrlMemoryCache.has(textSig)) return;

    const timer = setTimeout(() => {
      if (!contentToUse) return;
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: localArticle.title || '',
          author: localArticle.author || 'Redaksi SinPo',
          text: contentToUse,
        }),
      })
        .then((res) => res.ok ? res.blob() : null)
        .then((blob) => {
          if (blob) {
            const audioUrl = URL.createObjectURL(blob);
            articleAudioUrlMemoryCache.set(textSig, audioUrl);
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [localArticle?.id, fullContent, isSkeletonMode]);

  useEffect(() => {
    if (!localArticle || isSkeletonMode) return;

    // Jika konten penuh dari API sudah pernah diambil untuk artikel ini, jangan ditimpa
    if (localArticle.id && fetchedContentIdRef.current === localArticle.id) return;

    if (localArticle.id && articleContentMemoryCache.has(localArticle.id)) {
      const cached = articleContentMemoryCache.get(localArticle.id)!;
      fetchedContentIdRef.current = localArticle.id;
      setFullContent(cached);
      setIsFetchingDetail(false);
    } else {
      const bestContent = getFullBodyFromArticle(localArticle);
      setFullContent(bestContent);
      setIsFetchingDetail(!hasEnoughBody(bestContent));
    }
  }, [localArticle?.id, localArticle?.content, isSkeletonMode]);

  useEffect(() => {
    if (!localArticle || isSkeletonMode) return;
    const cleanTitle = stripHtml(localArticle.title || '');
    const cleanSummary = stripHtml(localArticle.summary || localArticle.subtitle || localArticle.content || '').slice(0, 200);
    const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://sinpo.id${getArticleUrl(localArticle)}`;
    const imageUrl = liveImageUrl || localArticle.imageUrl || 'https://sinpo.id/sinpo-favicon.png';

    const newsArticleSchema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': { '@type': 'WebPage', '@id': currentUrl },
      'headline': cleanTitle,
      'description': cleanSummary,
      'articleSection': (localArticle.category || 'POLITIK').toUpperCase(),
      'image': [imageUrl],
      'datePublished': localArticle.date || new Date().toISOString(),
      'dateModified': localArticle.date || new Date().toISOString(),
      'author': [{ '@type': 'Person', 'name': localArticle.author || 'Redaksi SinPo', 'jobTitle': 'Jurnalis', 'url': 'https://sinpo.id' }],
      'publisher': {
        '@type': 'Organization',
        'name': 'SinPo.id',
        'url': 'https://sinpo.id',
        'logo': { '@type': 'ImageObject', 'url': 'https://sinpo.id/sinpo-favicon.png', 'width': 512, 'height': 512 },
      },
      'isAccessibleForFree': true,
      'inLanguage': 'id-ID',
    };

    let scriptTag = document.getElementById('newsarticle-jsonld-client') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'newsarticle-jsonld-client';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(newsArticleSchema);
  }, [localArticle, liveImageUrl, isSkeletonMode]);

  const [isArticleNotFound, setIsArticleNotFound] = useState(() => isTakedownArticle(localArticle) || isScheduledArticle(localArticle));
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [liveGalleryImages, setLiveGalleryImages] = useState<string[]>(() => localArticle?.galleryImages || []);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const prevArticleIdRef = useRef<string | null>(localArticle?.id || null);

  useEffect(() => {
    const isSameArticle = prevArticleIdRef.current === localArticle?.id;
    prevArticleIdRef.current = localArticle?.id || null;

    if (isSameArticle) {
      setLiveImageUrl((prev) => pickNewerImageUrl(prev, localArticle?.imageUrl));
    } else {
      setLiveImageUrl(localArticle?.imageUrl || '');
    }
    setLiveGalleryImages(localArticle?.galleryImages || []);
    setActiveImageIndex(0);
    setIsArticleNotFound(isTakedownArticle(localArticle) || isScheduledArticle(localArticle));
  }, [localArticle]);

  const allGalleryImages = React.useMemo(() => {
    const category = (localArticle?.category || '').toUpperCase().trim();
    const isGalleryCategory = category === 'GALERI' || category === 'FOTO';
    if (!isGalleryCategory && (!localArticle?.galleryImages || localArticle.galleryImages.length === 0)) {
      const currentImg = liveImageUrl || localArticle?.imageUrl;
      return currentImg ? [currentImg] : [];
    }
    const list: string[] = [];
    const mainImg = liveImageUrl || localArticle?.imageUrl;
    if (mainImg && !mainImg.includes('placehold.co')) list.push(mainImg);
    (liveGalleryImages || []).forEach((imgUrl) => {
      if (imgUrl && !list.includes(imgUrl)) list.push(imgUrl);
    });
    return list;
  }, [localArticle?.id, localArticle?.category, localArticle?.imageUrl, localArticle?.galleryImages, liveGalleryImages, liveImageUrl]);

  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const handleCopyLink = () => {
    const targetUrl = typeof window !== 'undefined' ? window.location.href : `https://sinpo.id${getArticleUrl(localArticle)}`;
    navigator.clipboard.writeText(targetUrl).then(() => {
      setShowCopyTooltip(true);
      setTimeout(() => setShowCopyTooltip(false), 2000);
    }).catch(() => {});
  };

  const handleNativeShare = async () => {
    if (!localArticle) return;
    const targetUrl = typeof window !== 'undefined' ? window.location.href : `https://sinpo.id${getArticleUrl(localArticle)}`;
    const shareData = {
      title: stripHtml(localArticle.title),
      text: stripHtml(localArticle.summary || localArticle.subtitle || localArticle.title),
      url: targetUrl,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData); } catch (err: any) { if (err?.name !== 'AbortError') handleCopyLink(); }
    } else { handleCopyLink(); }
  };

  const extractViewCount = (data: any): number => {
    if (typeof data.counter === 'number') return data.counter;
    if (typeof data.dilihat === 'number') return data.dilihat;
    if (typeof data.views === 'number') return data.views;
    return parseInt(data.counter || data.dilihat || data.views || '0', 10) || 0;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    let isMounted = true;

    if (!isFallbackMode && (isTakedownArticle(localArticle) || isScheduledArticle(localArticle))) {
      setIsArticleNotFound(true);
      return;
    }
    setIsArticleNotFound(false);

    const targetIdOrSlug = resolveTargetIdOrSlug(localArticle);
    let hasIncrementedCounter = false;

    async function fetchArticleDetail(isInitial: boolean = false) {
      try {
        // Request pertama memakai shared promise (bisa sudah berjalan lewat prefetch), polling pakai apiFetch biasa
        const res = isInitial ? await fetchDetailShared(targetIdOrSlug) : await apiFetch(`/berita/${targetIdOrSlug}`);
        if (!isMounted) return;

        if (res && res.data) {
          const detailData = res.data as any;

          if (isTakedownArticle(detailData) || isScheduledArticle(detailData)) {
            setIsArticleNotFound(true);
            return;
          }
          setIsArticleNotFound(false);

          // Jika ini hasil tarikan fallback, matikan mode fallback (Matikan Skeleton)
          if (isFallbackMode && isInitial && detailData.judul) {
            setIsFallbackMode(false);
            setLocalArticle(prev => ({
              ...prev,
              title: stripHtml(detailData.judul),
              author: detailData.datawartawan?.nama_wartawan || (typeof detailData.penulis === 'object' ? detailData.penulis.nama : detailData.penulis) || 'Redaksi SinPo',
              category: detailData.datachannel?.nama || detailData.datakategori?.nama || detailData.kanal?.nama || 'BERITA',
              date: detailData.tanggal_tayang || detailData.published_at || prev.date,
              imageUrl: getStorageUrl(detailData.gambar_detail || detailData.gambar || '') || prev.imageUrl,
            }));
            document.title = `${stripHtml(detailData.judul)} - SinPo.id`;
          }

          if (isInitial && !hasIncrementedCounter) {
            hasIncrementedCounter = true;
            incrementArticleViewCounter(localArticle.id).then((newCount) => {
              if (isMounted && newCount && newCount > 0) setLiveViews((prev) => Math.max(prev ?? 0, newCount));
            });
          }

          const fetchedCount = extractViewCount(detailData);
          setLiveViews(prev => Math.max(prev ?? 0, localArticle.views ?? 0, localArticle.dilihat ?? 0, fetchedCount));

          const fetchedContent = detailData.isi || detailData.content || detailData.ringkasan || detailData.excerpt || detailData.sub_judul || '';
          if (fetchedContent) {
            if (localArticle?.id) {
              articleContentMemoryCache.set(localArticle.id, fetchedContent);
              fetchedContentIdRef.current = localArticle.id;
            }
            setFullContent(fetchedContent);
            setIsFetchingDetail(false);
          }

          if (!isInitial && detailData.judul && detailData.judul !== localArticle.title) {
            document.title = `${stripHtml(detailData.judul)} - SinPo.id`;
          }

          const latestRawImage = detailData.gambar_detail || detailData.gambar || detailData.image || detailData.cover || detailData.thumbnail || detailData.foto || '';
          if (latestRawImage) {
            setLiveImageUrl((prev) => pickNewerImageUrl(prev, getStorageUrl(latestRawImage)));
          }

          const rawGal = detailData.datagallery || detailData.datagambar || detailData.galeri || detailData.images || [];
          if (Array.isArray(rawGal) && rawGal.length > 0) {
            const parsedGal = rawGal.map((g: any) => {
              if (typeof g === 'string') return getStorageUrl(g);
              const photoPath = g.nama_photo || g.foto || g.gambar || g.photo || g.url || g.image || '';
              return getStorageUrl(photoPath);
            }).filter(Boolean);
            if (parsedGal.length > 0) setLiveGalleryImages(parsedGal);
            else setLiveGalleryImages(localArticle?.galleryImages || []);
          } else {
            setLiveGalleryImages(localArticle?.galleryImages || []);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        // Client baru akan men-trigger 404 jika response API jelas adalah 404 dan bukan transient issue
        if ((!localArticle?.title || isFallbackMode || isTakedownArticle(localArticle)) && (err?.status === 404 || err?.isNotFound)) {
          setIsArticleNotFound(true);
        }
      } finally {
        // Apapun hasilnya (sukses/gagal), skeleton isi berita harus berhenti agar fallback konten tampil
        if (isMounted && isInitial) setIsFetchingDetail(false);
      }
    }

    fetchArticleDetail(true);

    pollingRef.current = setInterval(() => { fetchArticleDetail(false); }, 30000);
    function handleVisibilityChange() { if (document.visibilityState === 'visible' && isMounted) fetchArticleDetail(false); }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localArticle.id, (localArticle as any).slug, isFallbackMode]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [localArticle?.id]);

  const toggleSpeech = async () => {
    if (!localArticle || isLoadingAudio) return;
    if (audioRef.current && audioRef.current.src) {
      if (isSpeaking) {
        audioRef.current.pause();
        setIsSpeaking(false);
      } else {
        if (audioRef.current.ended || audioRef.current.currentTime >= audioRef.current.duration) audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setIsSpeaking(true);
      }
      return;
    }

    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setIsAudioActive(true);
      setIsLoadingAudio(true);
      setIsSpeaking(false);

      const audio = new Audio();
      audio.playbackRate = playbackRate;
      audioRef.current = audio;

      const contentToUse = fullContent || getFallbackBodyFromArticle(localArticle);
      const textSig = localArticle.id ? `${localArticle.id}_${contentToUse.length}_${contentToUse.slice(0, 30)}` : '';
      let audioUrl = textSig ? articleAudioUrlMemoryCache.get(textSig) : undefined;

      if (!audioUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: localArticle.title || '',
              author: localArticle.author || 'Redaksi SinPo',
              text: contentToUse,
              category: localArticle.category || ''
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const blob = await res.blob();
            audioUrl = URL.createObjectURL(blob);
            if (textSig) articleAudioUrlMemoryCache.set(textSig, audioUrl);
          } else { throw new Error('Gagal memuat audio penyiar berita'); }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          setIsLoadingAudio(false);
          setIsSpeaking(false);
          setIsAudioActive(false);
          onShare('Gagal memuat audio penyiar berita.');
          return;
        }
      }

      if (audioUrl && audioRef.current === audio) {
        audio.src = audioUrl;
        audio.onloadedmetadata = () => { if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) setSpeechDuration(audio.duration); };
        audio.ondurationchange = () => { if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) setSpeechDuration(audio.duration); };
        audio.ontimeupdate = () => { if (!isDragging) setSpeechProgress(audio.currentTime); };
        audio.onended = () => { setIsSpeaking(false); };
        audio.onerror = () => { setIsSpeaking(false); setIsLoadingAudio(false); setIsAudioActive(false); onShare('Gagal memutar audio berita.'); };
        try {
          await audio.play();
          setIsSpeaking(true);
          setIsLoadingAudio(false);
        } catch (playErr) {
          setIsSpeaking(true);
          setIsLoadingAudio(false);
        }
      }
    } catch (e: any) {
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      onShare('Gagal memuat audio berita.');
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setIsAudioActive(false);
    setSpeechProgress(0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const handleSeek = (newSeconds: number) => {
    setSpeechProgress(newSeconds);
    if (audioRef.current) audioRef.current.currentTime = newSeconds;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isBookmarked = (bookmarkedIds || []).includes(localArticle?.id || '');

  const handleShareClick = () => {
    if (!localArticle) return;
    const url = typeof window !== 'undefined' ? window.location.href : `https://sinpo.id${getArticleUrl(localArticle)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    onShare("Tautan artikel berhasil disalin ke papan klip!");
  };

  // Tampilkan BodySkeleton hanya jika benar-benar tidak ada teks deskripsi/ringkasan sama sekali
  const isBodyLoading = isFetchingDetail && !stripHtml(fullContent || getFallbackBodyFromArticle(localArticle)).trim();

  // Render Skeleton jika state masih di mode kerangka Fallback (API Server tadinya gagal memuat data utuh)
  if (isSkeletonMode) {
    return (
      <article className="w-full flex flex-col gap-8 animate-fade-in">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Skeleton className="h-4 w-20 rounded-xs" />
            <Skeleton className="h-3 w-1 rounded-full" />
            <Skeleton className="h-4 w-36 rounded-xs" />
          </div>
          <div className="flex flex-col gap-2 items-center md:items-start">
            <Skeleton className="h-8 md:h-12 w-full rounded-sm" />
            <Skeleton className="h-8 md:h-12 w-11/12 rounded-sm" />
            <Skeleton className="h-8 md:h-12 w-3/4 rounded-sm" />
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 -mt-2">
            <Skeleton className="h-4 w-16 rounded-xs" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-4 md:gap-x-6 py-3 border-y border-slate-200/60 dark:border-slate-800/60">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-4 w-28 rounded-xs" />
            <Skeleton className="h-4 w-24 rounded-xs" />
          </div>
          <div className="relative rounded-[5px] overflow-hidden aspect-[16/9] border border-slate-200 dark:border-slate-800">
            <Skeleton className="w-full h-full rounded-[5px]" />
          </div>
          <div className="-mt-3.5 flex justify-between px-1">
            <Skeleton className="h-3 w-36 rounded-xs" />
            <Skeleton className="h-3 w-24 rounded-xs" />
          </div>
          <div className="flex flex-col gap-3.5 py-3.5 border-y border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-4 w-full">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
          <BodySkeleton />
        </div>
      </article>
    );
  }

  if (isArticleNotFound) {
    return (
      <NotFoundView
        title="404 NOT FOUND"
        message="Berita yang Anda cari tidak ditemukan, telah dihapus, atau belum dipublikasikan."
        onGoHome={onBack}
      />
    );
  }

  return (
    <article className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-6">
        
        <div className="flex items-center justify-center md:justify-start gap-2">
          <button
            onClick={() => { if (onSelectCategory) { onSelectCategory(localArticle.category.toUpperCase()); onBack(); } }}
            className="text-brand-red-600 dark:text-white font-sans text-[10px] font-bold tracking-wider uppercase hover:underline cursor-pointer active:scale-95 transition-transform focus:outline-none"
            title={`Lihat semua berita kategori ${localArticle.category}`}
          >
            {localArticle.category}
          </button>
          <span className="text-slate-400 text-xs font-sans">•</span>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-sans flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {localArticle.date}
          </span>
        </div>

        <h1 className="font-sans text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-slate-950 dark:text-white text-center md:text-left">
          {localArticle.title}
        </h1>

        {localArticle.subtitle && stripHtml(localArticle.subtitle).trim().length > 0 && stripHtml(localArticle.subtitle).trim() !== localArticle.title && (
          <p className="font-sans text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal italic text-center md:text-left">
            {stripHtml(localArticle.subtitle)}
          </p>
        )}

        <div className="flex items-center justify-center md:justify-start gap-2.5 -mt-2">
          <span className="font-sans text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase select-none">
            BAGIKAN :
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNativeShare}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan Artikel"
            >
              <Share className="h-4 w-4" />
            </button>
            <div className="relative inline-flex items-center">
              <button
                onClick={handleCopyLink}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="Salin Tautan"
              >
                <Link className="h-4 w-4" />
              </button>
              {showCopyTooltip && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium font-sans px-2.5 py-1 rounded shadow-md whitespace-nowrap animate-fade-in pointer-events-none z-30 flex items-center gap-1">
                  <span>link copied</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full flex flex-nowrap items-center justify-start gap-3 sm:gap-4 md:gap-6 py-3 px-0.5 border-y border-slate-200/60 dark:border-slate-800/60 text-xs sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 font-sans overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <User className="h-4 w-4 text-brand-red-600 shrink-0" /> Wartawan: <strong className="ml-0.5 font-bold text-slate-700 dark:text-slate-200">{localArticle.author}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700 shrink-0 select-none">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <Clock className="h-4 w-4 text-brand-red-600 shrink-0" /> Estimasi: <strong className="ml-0.5 font-bold text-slate-700 dark:text-slate-200">{formatTime(speechDuration)} {speechDuration >= 60 ? 'Menit' : 'Detik'}</strong>
          </span>
        </div>

        {allGalleryImages.length > 1 ? (
          <div className="flex flex-col gap-2.5">
            <div className="relative rounded-[5px] overflow-hidden aspect-[16/9] bg-slate-900 border border-slate-200 dark:border-slate-800 group select-none">
              <img
                src={allGalleryImages[activeImageIndex] || localArticle.imageUrl}
                alt={`${localArticle.title} - Foto ${activeImageIndex + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/ffffff?text=SinPo+Media'; }}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <button
                onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allGalleryImages.length - 1))}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-brand-red-600 text-white p-2.5 rounded-full backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 cursor-pointer shadow-lg active:scale-95 z-10"
                title="Foto Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveImageIndex((prev) => (prev < allGalleryImages.length - 1 ? prev + 1 : 0))}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-brand-red-600 text-white p-2.5 rounded-full backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 cursor-pointer shadow-lg active:scale-95 z-10"
                title="Foto Selanjutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar select-none">
              {allGalleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx ? 'border-brand-red-600 ring-2 ring-brand-red-600/30 scale-105 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative rounded-[5px] overflow-hidden aspect-[16/9] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <img
              src={liveImageUrl || localArticle.imageUrl}
              alt={localArticle.title}
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/ffffff?text=SinPo+Media'; }}
              className="w-full h-full object-cover rounded-[5px]"
            />
          </div>
        )}

        <div className="-mt-3.5 text-xs text-slate-400 dark:text-slate-500 italic font-sans px-1">
          <span>{localArticle.caption ? `Foto ${allGalleryImages.length > 1 ? `${activeImageIndex + 1}/${allGalleryImages.length}` : ''}: ${localArticle.caption}` : 'Foto: Dok. Istimewa / Ilustrasi'}</span>
        </div>

        <div className="flex flex-col gap-3.5 py-3.5 border-y border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 min-[375px]:p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] min-[375px]:text-xs font-sans shrink-0">
                <span className="hidden min-[350px]:inline-block text-[8px] min-[375px]:text-[9px] text-slate-400 uppercase tracking-wider px-1.5 min-[375px]:px-2 font-semibold select-none">HURUF</span>
                <button onClick={() => setFontSize('sm')} className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'sm' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}>A-</button>
                <button onClick={() => setFontSize('base')} className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'base' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}>A</button>
                <button onClick={() => setFontSize('lg')} className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'lg' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}>A+</button>
              </div>
              {ENABLE_TTS && (!isAudioActive ? (
                <button
                  onClick={toggleSpeech}
                  className="flex items-center gap-1 min-[375px]:gap-1.5 px-2 py-1 min-[375px]:px-3 min-[375px]:py-1.5 rounded-full font-sans text-[9.5px] min-[375px]:text-xs uppercase tracking-wider font-bold transition-all cursor-pointer bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50"
                  title="Dengarkan Berita (TTS)"
                >
                  <Volume2 className="h-3.5 w-3.5 min-[375px]:h-4 min-[375px]:w-4" />
                  <span>DENGARKAN BERITA</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 font-sans">
                  <button
                    onClick={stopSpeech}
                    className="p-1.5 rounded-full bg-transparent border border-slate-300 dark:border-slate-700 hover:border-brand-red-600 hover:text-brand-red-600 dark:hover:border-brand-red-500 dark:hover:text-brand-red-400 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                    title="Hentikan Suara (Stop)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={toggleSpeech}
                    disabled={isLoadingAudio}
                    className="p-1.5 rounded-full bg-transparent border border-slate-300 dark:border-slate-700 hover:border-brand-red-600 hover:text-brand-red-600 dark:hover:border-brand-red-500 dark:hover:text-brand-red-400 text-slate-600 dark:text-slate-400 transition-all cursor-pointer disabled:opacity-50"
                    title={isLoadingAudio ? "Memproses audio..." : isSpeaking ? "Jeda (Pause)" : "Lanjutkan (Continue)"}
                  >
                    {isLoadingAudio ? <Loader2 className="h-4 w-4 animate-spin text-brand-red-600" /> : isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 select-none font-light">|</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2 py-0.5 rounded border text-[11px] font-sans font-semibold bg-transparent transition-all cursor-pointer ${
                          playbackRate === speed ? 'border-brand-red-600 text-brand-red-600 dark:border-brand-red-500 dark:text-brand-red-400 font-bold shadow-xs' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        {speed}x &raquo;
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isAudioActive && (
            <div className="flex items-center gap-4 w-full pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 w-10 text-right select-none">{formatTime(speechProgress)}</span>
              <input
                type="range"
                min={0}
                max={speechDuration || 1}
                step={0.1}
                value={speechProgress}
                disabled={isLoadingAudio}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onChange={(e) => setSpeechProgress(Number(e.target.value))}
                onMouseUp={(e) => { setIsDragging(false); handleSeek(Number((e.target as HTMLInputElement).value)); }}
                onTouchEnd={(e) => { setIsDragging(false); handleSeek(Number((e.target as HTMLInputElement).value)); }}
                onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setIsDragging(true); }}
                onKeyUp={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { setIsDragging(false); handleSeek(speechProgress); } }}
                className={`flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-red-600 dark:accent-brand-red-500 focus:outline-none ${isLoadingAudio ? 'opacity-50' : ''}`}
              />
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 w-10 text-left select-none">{formatTime(speechDuration)}</span>
            </div>
          )}
        </div>

        {isSpeaking && (
          <div className="bg-brand-red-50 dark:bg-brand-red-950/20 border border-brand-red-200 dark:border-brand-red-950 rounded-lg p-3.5 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-brand-red-600 animate-ping shrink-0" />
            <p className="text-xs font-sans text-brand-red-800 dark:text-brand-red-400">Sistem sedang membaca berita secara audio dalam bahasa Indonesia... Anda dapat memperbesar teks atau menggulir untuk membaca artikel.</p>
          </div>
        )}

        <div className="relative flex flex-col gap-6 pb-12 md:pb-0">
          <div className="flex flex-col gap-4">
            {isBodyLoading ? (
              <BodySkeleton />
            ) : (
              <div
                className={`article-content font-sans tracking-wide leading-relaxed text-slate-800 dark:text-slate-200 transition-all duration-300 ${
                  fontSize === 'sm' ? "text-sm" : fontSize === 'base' ? "text-base" : "text-lg md:text-xl"
                }`}
                dangerouslySetInnerHTML={{ __html: formatArticleHtml(fullContent || buildInitialContent(localArticle)) }}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4 border-b border-slate-100 dark:border-slate-900/40 pb-4">
            <span className="font-sans text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Tags:</span>
            {(localArticle.tags || []).map((tag) => (
              <a
                key={tag}
                href={getTagUrl(tag)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                  e.preventDefault();
                  if (onSelectTag) onSelectTag(tag);
                }}
                className="font-sans text-[10px] font-bold text-slate-500 hover:text-brand-red-600 dark:text-slate-400 dark:hover:text-red-500 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded transition-all cursor-pointer active:scale-95 inline-block"
              >
                #{tag}
              </a>
            ))}
          </div>
        </div>

        {(() => {
          if (!articles || articles.length === 0) return null;
          const currentTags = (localArticle.tags || []).map((t) => t.toLowerCase().trim());
          const tagMatchedArticles = articles.filter((art) => {
            if (art.id === localArticle.id) return false;
            const artTags = (art.tags || []).map((t) => t.toLowerCase().trim());
            return currentTags.some((tag) => artTags.includes(tag));
          });
          tagMatchedArticles.sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));

          const finalRelated: Article[] = [...tagMatchedArticles];
          if (finalRelated.length < 6) {
            const categoryArticles = articles.filter((art) => {
              if (art.id === localArticle.id) return false;
              if (finalRelated.some((r) => r.id === art.id)) return false;
              return art.category.toUpperCase() === localArticle.category.toUpperCase();
            });
            categoryArticles.sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
            for (const catArt of categoryArticles) {
              if (finalRelated.length >= 6) break;
              finalRelated.push(catArt);
            }
          }

          if (finalRelated.length < 6) {
            const fallbackArticles = articles.filter((art) => {
              if (art.id === localArticle.id) return false;
              return !finalRelated.some((r) => r.id === art.id);
            });
            fallbackArticles.sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
            for (const fbArt of fallbackArticles) {
              if (finalRelated.length >= 6) break;
              finalRelated.push(fbArt);
            }
          }

          const fallbackRelated = finalRelated.slice(0, 6);
          if (fallbackRelated.length === 0) return null;

          return (
            <div className="mt-8 pt-2">
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                <h3 className="font-sans text-base font-black tracking-wider text-slate-950 dark:text-white uppercase">
                  BERITA TERKAIT
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {fallbackRelated.map((related, idx) => {
                  const isMobileImage = idx % 3 === 0;
                  const isDesktopImage = idx < 2;
                  let imageVisibilityClass = "";
                  if (isMobileImage && isDesktopImage) imageVisibilityClass = "block";
                  else if (isMobileImage && !isDesktopImage) imageVisibilityClass = "block md:hidden";
                  else if (!isMobileImage && isDesktopImage) imageVisibilityClass = "hidden md:block";
                  const showImageContainer = isMobileImage || isDesktopImage;

                  return (
                    <a key={related.id} href={getArticleUrl(related)} onMouseEnter={() => prefetchArticleDetail(related)} onTouchStart={() => prefetchArticleDetail(related)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return; e.preventDefault(); onSelectArticle?.(related); }} className="group flex gap-3.5 py-3.5 bg-transparent border-b border-slate-100 dark:border-slate-900 rounded-none cursor-pointer transition-all text-left">
                      {showImageContainer && related.imageUrl && (
                        <div className={`shrink-0 ${imageVisibilityClass}`}>
                          <img src={related.imageUrl} alt={related.title} referrerPolicy="no-referrer" className="w-16 h-16 sm:w-20 sm:h-20 object-cover aspect-square rounded-[4px] border border-slate-100 dark:border-slate-900" />
                        </div>
                      )}
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <h4 className="font-sans text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors line-clamp-3">{related.title}</h4>
                        <div className="flex items-center justify-between mt-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-sans shrink-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[50%]">{related.author}</span>
                          <span className="shrink-0 text-right">{related.date}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {(() => {
          const latestArticles = articles ? [...articles].filter((art) => art.id !== localArticle.id).sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime())).slice(0, 7) : [];
          if (latestArticles.length === 0) return null;
          return (
            <div className="mt-8 pt-2">
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                <h3 className="font-sans text-base font-black tracking-wider text-slate-950 dark:text-white uppercase">
                  BERITA TERKINI
                </h3>
              </div>
              <div className="flex flex-col">
                {latestArticles.map((latest) => (
                  <a key={latest.id} href={getArticleUrl(latest)} onMouseEnter={() => prefetchArticleDetail(latest)} onTouchStart={() => prefetchArticleDetail(latest)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return; e.preventDefault(); onSelectArticle?.(latest); }} className="group flex flex-row gap-4 py-4 border-b border-slate-100 dark:border-slate-900/40 cursor-pointer bg-transparent last:border-b-0">
                    <div className="relative w-24 h-16 md:w-36 md:h-24 shrink-0 overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                      <img src={latest.imageUrl} alt={latest.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                      <span className="text-[10px] font-sans font-black uppercase tracking-wider text-brand-red-600">{latest.category}</span>
                      <h4 className="font-sans text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 transition-colors line-clamp-2 my-auto py-0.5">{latest.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{latest.author}</span>
                        <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                        <span>{latest.date}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })()}

        {localArticle.comments && localArticle.comments.length > 0 && (
          <section id="article-comments-block" className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-sans text-base font-bold tracking-wider uppercase text-slate-950 dark:text-white">
                Kolom Opini Publik ({localArticle.comments.length})
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              {localArticle.comments.map((c) => (
                <div key={c.id} className="p-4 rounded-[5px] bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-800 dark:text-slate-200">{c.name}</strong>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-sans">{c.date}</span>
                      {myCommentIds?.includes(c.id) && onDeleteComment && (
                        <button type="button" onClick={() => onDeleteComment(localArticle.id, c.id)} className="p-1 text-slate-400 hover:text-brand-red-600 dark:hover:text-red-500 rounded-[5px] hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" title="Hapus tanggapan Anda">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{c.commentText}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </article>
  );
}