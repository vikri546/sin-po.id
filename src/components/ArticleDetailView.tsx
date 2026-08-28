import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Share2, MessageSquare, Calendar, User, Clock, Bookmark, HelpCircle, Eye, Trash2, MessageCircle, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';
import { getArticleUrl } from '@/lib/urlHelpers';

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
import { apiFetch, isTakedownArticle, incrementArticleViewCounter } from '../lib/apiClient';
import { parseAnyDate } from '../lib/dateFormatter';
import NotFoundView from './NotFoundView';

const calculateSpeechDuration = (title: string, author: string, content: string): number => {
  const text = `${title}. Ditulis oleh ${author}. ${stripHtml(content)}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.round((words / 160) * 60));
};

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
  if (isLoading) {
    return (
      <article className="w-full flex flex-col gap-8 animate-fade-in">
        <div className="flex flex-col gap-6">
          {/* Category & Date Badge */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Skeleton className="h-4 w-20 rounded-xs" />
            <Skeleton className="h-3 w-1 rounded-full" />
            <Skeleton className="h-4 w-36 rounded-xs" />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2 items-center md:items-start">
            <Skeleton className="h-8 md:h-12 w-full rounded-sm" />
            <Skeleton className="h-8 md:h-12 w-11/12 rounded-sm" />
            <Skeleton className="h-8 md:h-12 w-3/4 rounded-sm" />
          </div>

          {/* Share Section (Bagikan: icons) */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 -mt-2">
            <Skeleton className="h-4 w-16 rounded-xs" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
          </div>

          {/* Author & Read Time Info */}
          <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-4 md:gap-x-6 py-3 border-y border-slate-200/60 dark:border-slate-800/60">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-4 w-28 rounded-xs" />
            <Skeleton className="h-4 w-24 rounded-xs" />
          </div>

          {/* Article Image (16:9 aspect) */}
          <div className="relative rounded-[5px] overflow-hidden aspect-[16/9] border border-slate-200 dark:border-slate-800">
            <Skeleton className="w-full h-full rounded-[5px]" />
          </div>
          {/* Photo Caption */}
          <div className="-mt-3.5 flex justify-between px-1">
            <Skeleton className="h-3 w-36 rounded-xs" />
            <Skeleton className="h-3 w-24 rounded-xs" />
          </div>

          {/* Toolbar (TTS + Font Sizer) */}
          <div className="flex flex-col gap-3.5 py-3.5 border-y border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-4 w-full">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>

          {/* Content Paragraphs */}
          <div className="flex flex-col gap-3 py-4">
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
        </div>
      </article>
    );
  }
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0); // in seconds
  const [speechDuration, setSpeechDuration] = useState(() => 
    calculateSpeechDuration(article.title, article.author, article.content)
  );
  const [isDragging, setIsDragging] = useState(false);
  
  const [liveViews, setLiveViews] = useState<number | null>(null);
  const [fullContent, setFullContent] = useState<string>(article.content || article.summary || article.subtitle || '');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize duration dynamically based on word count whenever article changes
  useEffect(() => {
    const contentToUse = fullContent || article.content || article.summary || '';
    const seconds = calculateSpeechDuration(article.title, article.author, contentToUse);
    setSpeechDuration(seconds);
    setSpeechProgress(0);
    setLiveViews(null);
  }, [article, fullContent]);

  useEffect(() => {
    setFullContent(article.content || article.summary || article.subtitle || '');
  }, [article.id, article.content]);

  // Article Not Found state (takedown / schedule / 404)
  const [isArticleNotFound, setIsArticleNotFound] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: extract view count from raw API data
  const extractViewCount = (data: any): number => {
    if (typeof data.counter === 'number') return data.counter;
    if (typeof data.dilihat === 'number') return data.dilihat;
    if (typeof data.views === 'number') return data.views;
    return parseInt(data.counter || data.dilihat || data.views || '0', 10) || 0;
  };

  // Initial fetch + 30s real-time polling (matching sinpo 2 startArticlePolling)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setIsArticleNotFound(false);
    let isMounted = true;

    const rawId = article.id.replace('laravel-', '');
    const targetIdOrSlug = (article as any).slug || rawId;

    // Trigger counter increment on CMS backend via /counter.php (matching sinpo 2 updateArticleCounter)
    incrementArticleViewCounter(article.id).then((newCount) => {
      if (isMounted && newCount && newCount > 0) {
        setLiveViews((prev) => Math.max(prev ?? 0, newCount));
      }
    });

    // Core fetch function — used for initial load and polling
    async function fetchArticleDetail(isInitial: boolean = false) {
      try {
        const res = await apiFetch(`/berita/${targetIdOrSlug}`);
        if (!isMounted) return;

        if (res && res.data) {
          const detailData = res.data as any;

          // Check takedown / scheduled status from raw API data
          if (isTakedownArticle(detailData)) {
            setIsArticleNotFound(true);
            return;
          }

          // 1. View counter — always take the highest value (matching sinpo 2 logic)
          const fetchedCount = extractViewCount(detailData);
          setLiveViews(prev => {
            const currentMax = Math.max(prev ?? 0, article.views ?? 0, article.dilihat ?? 0);
            return Math.max(currentMax, fetchedCount);
          });

          // 2. Content / Isi — live edit sync
          const fetchedContent = detailData.isi || detailData.content || detailData.ringkasan || detailData.excerpt || detailData.sub_judul || '';
          if (fetchedContent) {
            setFullContent(fetchedContent);
          }

          // 3. Title — live edit sync (only on polling, not initial)
          if (!isInitial && detailData.judul && detailData.judul !== article.title) {
            // Update document title for SEO
            document.title = `${stripHtml(detailData.judul)} - SinPo.id`;
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        // If API returns 404 — article takedown / deleted / rescheduled
        if (err?.status === 404 || err?.isNotFound) {
          setIsArticleNotFound(true);
        }
      }
    }

    // Initial fetch (triggers view count increment on API backend)
    fetchArticleDetail(true);

    // 30-second real-time polling (matching sinpo 2 articlePollingInterval = 30000)
    pollingRef.current = setInterval(() => {
      fetchArticleDetail(false);
    }, 30000);

    // Tab visibility listener — immediate refetch when tab becomes visible
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && isMounted) {
        fetchArticleDetail(false);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [article.id, (article as any).slug]);

  // Handle ticking progress when TTS is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSpeaking && !isDragging) {
      interval = setInterval(() => {
        setSpeechProgress((prev) => {
          if (prev >= speechDuration) {
            // Cap it at speechDuration so it doesn't overflow, but do NOT stop speaking.
            // Let the utterance's onend handler handle the actual completion.
            return speechDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeaking, isDragging, speechDuration]);

  // Handle Indonesian audio Text-to-Speech synthesis and seeking
  const toggleSpeech = () => {
    if (isSpeaking) {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onboundary = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechProgress(0);
    } else {
      window.speechSynthesis.cancel(); // Stop any other running synthesis
      setSpeechProgress(0);

      // Clean the text to avoid reading HTML codes
      const contentToRead = `${article.title}. Ditulis oleh ${article.author}. ${stripHtml(article.content)}`;
      
      const utterance = new SpeechSynthesisUtterance(contentToRead);
      utterance.lang = 'id-ID';

      // Attempt to bind an Indonesian voice specifically
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeechProgress(0);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeechProgress(0);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleSeek = (newSeconds: number) => {
    setSpeechProgress(newSeconds);
    
    // If speaking, restart from that percentage of the text content
    if (isSpeaking) {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onboundary = null;
      }
      window.speechSynthesis.cancel();
      
      const contentToRead = `${article.title}. Ditulis oleh ${article.author}. ${stripHtml(article.content)}`;
      const percentage = newSeconds / speechDuration;
      const startCharIndex = Math.floor(percentage * contentToRead.length);
      const remainingText = contentToRead.substring(startCharIndex);
      
      if (remainingText.trim().length > 0) {
        const utterance = new SpeechSynthesisUtterance(remainingText);
        utterance.lang = 'id-ID';
        
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
        if (idVoice) {
          utterance.voice = idVoice;
        }
        
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeechProgress(0);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setSpeechProgress(0);
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        setSpeechProgress(0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const isBookmarked = bookmarkedIds.includes(article.id);



  const handleShareClick = () => {
    const url = `${window.location.origin}/artikel/${article.id}`;
    navigator.clipboard.writeText(url);
    onShare("Tautan artikel berhasil disalin ke papan klip!");
  };

  // If article was detected as takedown / scheduled / deleted during polling
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
      
      {/* Main Core Content */}
      <div className="flex flex-col gap-6">
        
        {/* Category & Date Badge */}
        <div className="flex items-center justify-center md:justify-start gap-2">
          <button
            onClick={() => {
              if (onSelectCategory) {
                onSelectCategory(article.category.toUpperCase());
                onBack();
              }
            }}
            className="text-brand-red-600 dark:text-white font-sans text-[10px] font-bold tracking-wider uppercase hover:underline cursor-pointer active:scale-95 transition-transform focus:outline-none"
            title={`Lihat semua berita kategori ${article.category}`}
          >
            {article.category}
          </button>
          <span className="text-slate-400 text-xs font-sans">•</span>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-sans flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {article.date}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-sans text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-slate-950 dark:text-white text-center md:text-left">
          {article.title}
        </h1>

        {/* Subtitle / Ringkasan Deskripsi Teaser */}
        {(article.subtitle || article.summary) && (
          <p className="font-sans text-base md:text-lg text-slate-600 dark:text-slate-300 border-l-4 border-brand-red-600 pl-4 py-1.5 italic font-medium leading-relaxed">
            {stripHtml(article.subtitle || article.summary)}
          </p>
        )}

        {/* Share Section (Bagikan: WA FB X IG IN) */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 -mt-2">
          <span className="font-sans text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase select-none">
            Bagikan:
          </span>
          <div className="flex items-center gap-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' - ' + window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan ke WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan ke Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan ke X"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan ke Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Bagikan ke LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Author & Read Time Info */}
        <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-1.5 min-[375px]:gap-x-3 sm:gap-x-4 md:gap-x-6 py-3 border-y border-slate-200/60 dark:border-slate-800/60 text-[8.5px] min-[375px]:text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-sans overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="flex items-center gap-1 md:gap-1.5 shrink-0">
            <User className="hidden md:inline h-4 w-4 text-brand-red-600" /> Wartawan: <strong className="ml-0.5">{article.author}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-800 shrink-0 select-none">•</span>
          <span className="flex items-center gap-1 md:gap-1.5 shrink-0">
            <Clock className="hidden md:inline h-4 w-4 text-brand-red-600" /> Estimasi: <strong className="ml-0.5">{formatTime(speechDuration)} {speechDuration >= 60 ? 'Menit' : 'Detik'}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-800 shrink-0 select-none">•</span>
          <span className="flex items-center gap-1 md:gap-1.5 shrink-0">
            <Eye className="hidden md:inline h-4 w-4 text-brand-red-600" /> Dilihat: <strong className="ml-0.5">{(liveViews ?? article.views ?? article.dilihat ?? 0).toLocaleString('id-ID')} kali</strong>
          </span>
        </div>

        {/* Article Image */}
        <div className="relative rounded-[5px] overflow-hidden aspect-[16/9] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <img
            src={article.imageUrl}
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/ffffff?text=SinPo+Media';
            }}
            className="w-full h-full object-cover rounded-[5px]"
          />
        </div>
        <div className="-mt-3.5 text-xs text-slate-400 dark:text-slate-500 italic font-sans px-1">
          <span>{article.caption ? `Foto: ${article.caption}` : 'Foto: Dok. Istimewa / Ilustrasi'}</span>
        </div>

        {/* Dynamic Toolbars (TTS, Bookmark, Share, Font Size) & Progress Player Block - Placed after Image */}
        <div className="flex flex-col gap-3.5 py-3.5 border-y border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full">
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* TTS Audio Reader */}
              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-1 min-[375px]:gap-1.5 px-2 py-1 min-[375px]:px-3 min-[375px]:py-1.5 rounded-full font-sans text-[9.5px] min-[375px]:text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  isSpeaking
                    ? "bg-brand-red-600 text-white"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50"
                }`}
                title={isSpeaking ? "Hentikan Suara" : "Dengarkan Berita (TTS)"}
              >
                {isSpeaking ? <VolumeX className="h-3.5 w-3.5 min-[375px]:h-4 min-[375px]:w-4" /> : <Volume2 className="h-3.5 w-3.5 min-[375px]:h-4 min-[375px]:w-4" />}
                <span>{isSpeaking ? "TUTUP" : "DENGARKAN BERITA"}</span>
              </button>
            </div>

            {/* Font Sizer */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 min-[375px]:p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] min-[375px]:text-xs font-sans shrink-0">
              <span className="hidden min-[350px]:inline-block text-[8px] min-[375px]:text-[9px] text-slate-400 uppercase tracking-wider px-1.5 min-[375px]:px-2 font-semibold select-none">HURUF</span>
              <button
                onClick={() => setFontSize('sm')}
                className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'sm' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'base' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-1.5 min-[375px]:px-2 py-0.5 rounded cursor-pointer ${fontSize === 'lg' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Progress Slider (Visible when speaking/listening) */}
          {isSpeaking && (
            <div className="flex items-center gap-4 w-full pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 w-8 text-right select-none">
                {formatTime(speechProgress)}
              </span>
              <input
                type="range"
                min={0}
                max={speechDuration}
                value={speechProgress}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onChange={(e) => setSpeechProgress(Number(e.target.value))}
                onMouseUp={(e) => {
                  setIsDragging(false);
                  handleSeek(Number((e.target as HTMLInputElement).value));
                }}
                onTouchEnd={(e) => {
                  setIsDragging(false);
                  handleSeek(Number((e.target as HTMLInputElement).value));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    setIsDragging(true);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    setIsDragging(false);
                    handleSeek(speechProgress);
                  }
                }}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-red-600 dark:accent-brand-red-500 focus:outline-none"
              />
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 w-8 text-left select-none">
                {formatTime(speechDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Interactive Audio Warning for Indonesian Readers */}
        {isSpeaking && (
          <div className="bg-brand-red-50 dark:bg-brand-red-950/20 border border-brand-red-200 dark:border-brand-red-950 rounded-lg p-3.5 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-brand-red-600 animate-ping shrink-0" />
            <p className="text-xs font-sans text-brand-red-800 dark:text-brand-red-400">
              Sistem sedang membaca berita secara audio dalam bahasa Indonesia... Anda dapat memperbesar teks atau menggulir untuk membaca artikel.
            </p>
          </div>
        )}

        {/* Relative content wrapper to control the boundary of the sticky bottom-right share button */}
        <div className="relative flex flex-col gap-6 pb-12 md:pb-0">
          {/* Article Paragraph Content */}
          <div
            className={`article-content font-sans tracking-wide leading-relaxed text-slate-800 dark:text-slate-200 ${
              fontSize === 'sm'
                ? "text-sm"
                : fontSize === 'base'
                  ? "text-base"
                  : "text-lg md:text-xl"
            }`}
            dangerouslySetInnerHTML={{ __html: formatArticleHtml(fullContent || article.content || article.summary || article.subtitle || 'Isi artikel sedang dimuat...') }}
          />

          {/* Article Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-b border-slate-100 dark:border-slate-900/40 pb-4">
            <span className="font-sans text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Tags:</span>
            {article.tags.map((tag) => (
              <a
                key={tag}
                href={`?tag=${encodeURIComponent(tag)}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  if (onSelectTag) {
                    onSelectTag(tag);
                  }
                }}
                className="font-sans text-[10px] font-bold text-slate-500 hover:text-brand-red-600 dark:text-slate-400 dark:hover:text-red-500 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded transition-all cursor-pointer active:scale-95 inline-block"
              >
                #{tag}
              </a>
            ))}
          </div>


        </div>

        {/* BERITA TERKAIT Section (Tag-matched & Relevant articles, total 6 items) */}
        {(() => {
          if (!articles || articles.length === 0) return null;

          const currentTags = (article.tags || []).map((t) => t.toLowerCase().trim());

          // 1. Find articles sharing at least one common tag with the current article
          const tagMatchedArticles = articles.filter((art) => {
            if (art.id === article.id) return false;
            const artTags = (art.tags || []).map((t) => t.toLowerCase().trim());
            return currentTags.some((tag) => artTags.includes(tag));
          });

          // Sort tag-matched articles newest first
          tagMatchedArticles.sort(
            (a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime())
          );

          const finalRelated: Article[] = [...tagMatchedArticles];

          // 2. If tag-matched articles are less than 6, fill up with same-category articles
          if (finalRelated.length < 6) {
            const categoryArticles = articles.filter((art) => {
              if (art.id === article.id) return false;
              if (finalRelated.some((r) => r.id === art.id)) return false;
              return art.category.toUpperCase() === article.category.toUpperCase();
            });

            categoryArticles.sort(
              (a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime())
            );

            for (const catArt of categoryArticles) {
              if (finalRelated.length >= 6) break;
              finalRelated.push(catArt);
            }
          }

          // 3. If still less than 6, fill up with remaining latest articles
          if (finalRelated.length < 6) {
            const fallbackArticles = articles.filter((art) => {
              if (art.id === article.id) return false;
              return !finalRelated.some((r) => r.id === art.id);
            });

            fallbackArticles.sort(
              (a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime())
            );

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
                  if (isMobileImage && isDesktopImage) {
                    imageVisibilityClass = "block";
                  } else if (isMobileImage && !isDesktopImage) {
                    imageVisibilityClass = "block md:hidden";
                  } else if (!isMobileImage && isDesktopImage) {
                    imageVisibilityClass = "hidden md:block";
                  }

                  const showImageContainer = isMobileImage || isDesktopImage;

                  return (
                    <a
                      key={related.id}
                      href={getArticleUrl(related)}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                        e.preventDefault();
                        onSelectArticle?.(related);
                      }}
                      className="group flex gap-3.5 py-3.5 bg-transparent border-b border-slate-100 dark:border-slate-900 rounded-none cursor-pointer transition-all text-left"
                    >
                      {showImageContainer && related.imageUrl && (
                        <div className={`shrink-0 ${imageVisibilityClass}`}>
                          <img
                            src={related.imageUrl}
                            alt={related.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover aspect-square rounded-[4px] border border-slate-100 dark:border-slate-900"
                          />
                        </div>
                      )}
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        {/* Title */}
                        <h4 className="font-sans text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors line-clamp-3">
                          {related.title}
                        </h4>

                        {/* Wartawan on Left, Tanggal on Right */}
                        <div className="flex items-center justify-between mt-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-sans shrink-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[50%]">
                            {related.author}
                          </span>
                          <span className="shrink-0 text-right">
                            {related.date}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* BERITA TERKINI Section (Strictly newest to oldest across mixed categories, total 7 items) */}
        {(() => {
          const latestArticles = articles
            ? [...articles]
                .filter((art) => art.id !== article.id)
                .sort(
                  (a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime())
                )
                .slice(0, 7)
            : [];
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
                  <a
                    key={latest.id}
                    id={`article-detail-latest-card-${latest.id}`}
                    href={getArticleUrl(latest)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelectArticle?.(latest);
                    }}
                    className="group flex flex-row gap-4 py-4 border-b border-slate-100 dark:border-slate-900/40 cursor-pointer bg-transparent last:border-b-0"
                  >
                    {/* Left Side: Image */}
                    <div className="relative w-24 h-16 md:w-36 md:h-24 shrink-0 overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                      <img
                        src={latest.imageUrl}
                        alt={latest.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Right Side: Category, Title, Author & Date */}
                    <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                      {/* Category */}
                      <span className="text-[10px] font-sans font-black uppercase tracking-wider text-brand-red-600">
                        {latest.category}
                      </span>

                      {/* Title */}
                      <h4 className="font-sans text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 transition-colors line-clamp-2 my-auto py-0.5">
                        {latest.title}
                      </h4>

                      {/* Wartawan (Author) & Tanggal (Date) */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {latest.author}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                        <span>
                          {latest.date}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Comments Block */}
        {article.comments && article.comments.length > 0 && (
          <section id="article-comments-block" className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-sans text-base font-bold tracking-wider uppercase text-slate-950 dark:text-white">
                Kolom Opini Publik ({article.comments.length})
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {article.comments.map((c) => (
                <div key={c.id} className="p-4 rounded-[5px] bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-800 dark:text-slate-200">{c.name}</strong>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-sans">{c.date}</span>
                      {myCommentIds?.includes(c.id) && onDeleteComment && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(article.id, c.id)}
                          className="p-1 text-slate-400 hover:text-brand-red-600 dark:hover:text-red-500 rounded-[5px] hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Hapus tanggapan Anda"
                        >
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
