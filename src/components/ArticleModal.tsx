"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, VolumeX, Share2, MessageSquare, Calendar, User, Clock, Bookmark, HelpCircle, Loader2, Play, Pause } from 'lucide-react';
import { Article, Comment } from '../types';
import { formatArticleHtml, stripHtml } from '../lib/htmlRenderer';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onAddComment: (articleId: string, name: string, commentText: string) => void;
  onShare: (message: string) => void;
}

// In-memory cache for generated audio Blob URLs per article ID in Modal
const modalAudioUrlCache = new Map<string, string>();

export default function ArticleModal({
  article,
  onClose,
  bookmarkedIds,
  onToggleBookmark,
  onAddComment,
  onShare
}: ArticleModalProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (article) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [article]);

  useEffect(() => {
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    return () => {
      setIsSpeaking(false);
      setIsLoadingAudio(false);
    };
  }, [article?.id]);

  // Silent background pre-generation of TTS audio on modal open for instant 0-1s playback
  useEffect(() => {
    if (!article?.id) return;
    const contentToUse = article.content || article.summary || '';
    const textSig = `${article.id}_${contentToUse.length}_${contentToUse.slice(0, 30)}`;
    if (modalAudioUrlCache.has(textSig)) return;

    const timer = setTimeout(() => {
      if (!contentToUse) return;

      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title || '',
          author: article.author || 'Redaksi SinPo',
          text: contentToUse,
        }),
      })
        .then((res) => {
          if (res.ok) return res.blob();
          return null;
        })
        .then((blob) => {
          if (blob) {
            const audioUrl = URL.createObjectURL(blob);
            modalAudioUrlCache.set(textSig, audioUrl);
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [article?.id]);


  // Handle OpenVoice / Edge-Neural Text-to-Speech audio synthesis & instant playback
  const toggleSpeech = async () => {
    if (!article || isLoadingAudio) return;

    if (audioRef.current && audioRef.current.src) {
      if (isSpeaking) {
        audioRef.current.pause();
        setIsSpeaking(false);
      } else {
        if (audioRef.current.ended || audioRef.current.currentTime >= audioRef.current.duration) {
          audioRef.current.currentTime = 0;
        }
        audioRef.current.play().catch(() => {});
        setIsSpeaking(true);
      }
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsAudioActive(true);
      setIsLoadingAudio(true);
      setIsSpeaking(false);

      const contentToUse = article.content || article.summary || '';
      const textSig = article.id ? `${article.id}_${contentToUse.length}_${contentToUse.slice(0, 30)}` : '';
      let audioUrl = textSig ? modalAudioUrlCache.get(textSig) : undefined;

      if (!audioUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout for full articles

        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: article.title || '',
              author: article.author || 'Redaksi SinPo',
              text: contentToUse
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const blob = await res.blob();
            audioUrl = URL.createObjectURL(blob);
            if (textSig) {
              modalAudioUrlCache.set(textSig, audioUrl);
            }
          } else {
            throw new Error('Gagal memuat audio berita');
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          console.warn('TTS Fetch Warning:', fetchErr?.message || fetchErr);
          setIsLoadingAudio(false);
          setIsSpeaking(false);
          setIsAudioActive(false);
          onShare('Gagal memuat audio berita.');
          return;
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.playbackRate = playbackRate;
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setIsLoadingAudio(false);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          // Keep isAudioActive = true so player controls stay visible
          // User must manually click Stop (X) to return to Dengarkan Berita button
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setIsLoadingAudio(false);
          setIsAudioActive(false);
          onShare('Gagal memutar audio berita.');
        };

        await audio.play();
        setIsSpeaking(true);
        setIsLoadingAudio(false);
      }
    } catch (err) {
      console.error(err);
      setIsLoadingAudio(false);
      setIsSpeaking(false);
      onShare('Gagal memuat audio berita.');
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setIsAudioActive(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  if (!article) return null;

  const isBookmarked = bookmarkedIds.includes(article.id);

  const handleShareClick = () => {
    const url = `https://sinpo.id/artikel/${article.id}`;
    navigator.clipboard.writeText(url);
    onShare("Tautan artikel berhasil disalin ke papan klip!");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Shell Container */}
        <div className="flex min-h-full items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
          >
            
            {/* Top Bar (Actions, Resizer, TTS, Close) */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 py-4">
              
              {/* Text to Speech & Bookmark & Share Buttons */}
              <div className="flex items-center gap-2">
                
                {/* Audio Reader & Executed Controls */}
                {!isAudioActive ? (
                  <button
                    onClick={toggleSpeech}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs uppercase tracking-wider font-bold transition-all bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer"
                    title="Dengarkan Berita (TTS)"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>DENGARKAN BERITA</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 font-sans">
                    {/* Stop Button (Icon silang, bg transparant, border circle) */}
                    <button
                      onClick={stopSpeech}
                      className="p-1.5 rounded-full bg-transparent border border-slate-300 dark:border-slate-700 hover:border-brand-red-600 hover:text-brand-red-600 dark:hover:border-brand-red-500 dark:hover:text-brand-red-400 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                      title="Hentikan Suara (Stop)"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Pause/Continue Button (Icon pause/continue, bg transparant, border circle) */}
                    <button
                      onClick={toggleSpeech}
                      disabled={isLoadingAudio}
                      className="p-1.5 rounded-full bg-transparent border border-slate-300 dark:border-slate-700 hover:border-brand-red-600 hover:text-brand-red-600 dark:hover:border-brand-red-500 dark:hover:text-brand-red-400 text-slate-600 dark:text-slate-400 transition-all cursor-pointer disabled:opacity-50"
                      title={isLoadingAudio ? "Memproses audio..." : isSpeaking ? "Jeda (Pause)" : "Lanjutkan (Continue)"}
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-red-600" />
                      ) : isSpeaking ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>

                    {/* Separator */}
                    <span className="text-slate-300 dark:text-slate-700 select-none font-light">|</span>

                    {/* Speed Controls: 1x >>, 2x >>, 3x >> */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-0.5 rounded border text-[11px] font-sans font-semibold bg-transparent transition-all cursor-pointer ${
                            playbackRate === speed
                              ? 'border-brand-red-600 text-brand-red-600 dark:border-brand-red-500 dark:text-brand-red-400 font-bold shadow-xs'
                              : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                          title={`Kecepatan ${speed}x`}
                        >
                          {speed}x &raquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bookmark Toggle */}
                <button
                  onClick={() => onToggleBookmark(article.id)}
                  className={`p-2 rounded-full border transition-all ${
                    isBookmarked
                      ? "bg-brand-red-100 dark:bg-brand-red-950/40 border-brand-red-600 text-brand-red-600"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500"
                  }`}
                  title={isBookmarked ? "Hapus Bookmark" : "Simpan Berita"}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                </button>

                {/* Share Link */}
                <button
                  onClick={handleShareClick}
                  className="p-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 transition-all"
                  title="Bagikan Tautan"
                >
                  <Share2 className="h-4 w-4" />
                </button>

              </div>

              {/* Text Resizer & Close Button */}
              <div className="flex items-center gap-3">
                
                {/* Font Sizers */}
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-sans">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2 font-semibold">UKURAN HURUF</span>
                  <button
                    onClick={() => setFontSize('sm')}
                    className={`px-2 py-1 rounded ${fontSize === 'sm' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize('base')}
                    className={`px-2 py-1 rounded ${fontSize === 'base' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize('lg')}
                    className={`px-2 py-1 rounded ${fontSize === 'lg' ? "bg-white dark:bg-slate-800 text-brand-red-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    A+
                  </button>
                </div>

                {/* Close X */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                  title="Tutup Pembaca"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

            </div>

            {/* Scrollable Main Article Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 flex flex-col gap-6">
              
              {/* Category and Date Badge */}
              <div className="flex items-center gap-2">
                <span className="bg-brand-red-600 text-white font-sans text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase">
                  {article.category}
                </span>
                <span className="text-slate-400 text-xs font-sans">•</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-sans flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {article.date}
                </span>
              </div>

              {/* Title Header */}
              <h1 className="font-sans text-3xl md:text-4.5xl font-bold tracking-tight leading-tight text-slate-950 dark:text-white">
                {article.title}
              </h1>

              {/* Subtitle / Teaser */}
              {article.subtitle && (
                <p className="font-sans text-sm md:text-base text-slate-600 dark:text-slate-400 border-l-4 border-brand-red-600 pl-4 py-1 italic">
                  {stripHtml(article.subtitle)}
                </p>
              )}

              {/* Author & Read Time Info */}
              <div className="flex items-center gap-4 py-2 border-y border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400 font-sans">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-brand-red-600" /> Penulis: <strong>{article.author}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-red-600" /> Estimasi: <strong>{article.readTime}</strong>
                </span>
              </div>

              {/* Article Main Visual Banner */}
              <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="-mt-2 text-xs text-slate-400 dark:text-slate-500 italic font-sans px-1">
                <span>{article.caption ? `Foto: ${article.caption}` : 'Foto: Dok. Istimewa / Ilustrasi'}</span>
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

              {/* Article Paragraph Content */}
              <div
                className={`article-content font-sans tracking-wide leading-relaxed text-slate-800 dark:text-slate-200 ${
                  fontSize === 'sm'
                    ? "text-sm"
                    : fontSize === 'base'
                      ? "text-base"
                      : "text-lg md:text-xl"
                }`}
                dangerouslySetInnerHTML={{ __html: formatArticleHtml(article.content || article.summary || article.subtitle || '') }}
              />

              {/* Article Tags */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* C. Dynamic Comment System Section */}
              {article.comments && article.comments.length > 0 && (
                <section id="article-comments-block" className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <MessageSquare className="h-5 w-5 text-brand-red-600" />
                    <h3 className="font-sans text-base font-bold tracking-wider uppercase text-slate-950 dark:text-white">
                      Kolom Opini Publik ({article.comments.length})
                    </h3>
                  </div>

                  <div className="flex flex-col gap-4 mb-6">
                    {article.comments.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-1.5 font-sans">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-slate-800 dark:text-slate-200">{c.name}</strong>
                          <span className="text-[10px] text-slate-400 font-sans">{c.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{c.commentText}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* Bottom Sticky Action Bar inside the reader */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between text-xs text-slate-400 font-sans">
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> Seluruh tanggapan tunduk pada undang-undang ITE Indonesia.
              </span>
              <button
                onClick={onClose}
                className="font-sans font-bold uppercase tracking-wider text-brand-red-600 hover:text-brand-red-700 transition-colors"
              >
                Selesai Membaca & Tutup
              </button>
            </div>

          </motion.div>
        </div>

      </div>
    </AnimatePresence>
  );
}
