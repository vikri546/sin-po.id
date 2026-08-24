import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, MessageSquare, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';

interface SidebarProps {
  onSelectPopular: (popularId: string) => void;
  hideExtraWidgets?: boolean;
  variant?: 'home' | 'detail';
  showSearchBanners?: boolean;
  articles?: Article[];
  popularArticles?: Article[];
  onSelectArticle?: (article: Article) => void;
  isLoading?: boolean;
}

const POPULAR_IMAGES: Record<string, string> = {
  "pop-1": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
  "pop-2": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  "pop-3": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
  "pop-4": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
  "pop-5": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
};

export default function Sidebar({ 
  onSelectPopular, 
  hideExtraWidgets = false, 
  variant = 'home',
  showSearchBanners = false,
  articles = [],
  popularArticles = [],
  onSelectArticle,
  isLoading = false
}: SidebarProps) {
  if (isLoading) {
    return (
      <aside className="flex flex-col gap-8 w-full animate-fade-in">
        {/* BONGKAR Banner Skeleton (hidden on mobile, dark bg) */}
        {showSearchBanners && (
          <div className="hidden md:flex w-full bg-slate-900 rounded-[5px] border-[3px] border-slate-700/40 p-5 flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-slate-700/40 pb-2 mb-1">
              <Skeleton className="h-8 w-28 rounded-sm" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="h-4 w-4/5 rounded-sm" />
            </div>
          </div>
        )}

        {/* SIN PO DULU Banner Skeleton (hidden on mobile) */}
        {showSearchBanners && (
          <div className="hidden md:flex w-full bg-slate-900 rounded-[5px] border-[3px] border-slate-700/40 p-5 flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center border-b-2 border-slate-700/40 pb-2 mb-1">
              <Skeleton className="h-7 w-32 rounded-sm" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-4 w-full rounded-sm" />
            </div>
          </div>
        )}

        {/* BERITA TERPOPULER Section Skeleton */}
        <section className="hidden md:block bg-white dark:bg-slate-950 p-6 rounded-[5px] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
            <Skeleton className="h-6 w-44 rounded-sm" />
          </div>
          <div className="flex flex-col gap-4">
            {/* Home variant: numbered list */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start pb-3 border-b border-slate-100 dark:border-slate-900/50 last:border-b-0 last:pb-0">
                {/* Number */}
                <Skeleton className="w-9 md:w-11 h-9 rounded-xs shrink-0" />
                {/* Content */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <Skeleton className="h-3 w-16 rounded-xs" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-xs" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Editorial Poster Skeleton (hidden on mobile) */}
        {!hideExtraWidgets && !showSearchBanners && (
          <div className="hidden md:block relative overflow-hidden rounded-[5px] border border-slate-200 dark:border-slate-800">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[5px]">
              <Skeleton className="w-full h-full rounded-[5px]" />
            </div>
          </div>
        )}

        {/* Audio Player Skeleton (hidden on mobile) */}
        {!hideExtraWidgets && !showSearchBanners && (
          <section className="hidden md:flex flex-col gap-3">
            <div className="bg-slate-900 rounded-[5px] border border-slate-800 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-xs" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-3 w-full rounded-xs" />
                  <Skeleton className="h-3 w-3/4 rounded-xs" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </section>
        )}
      </aside>
    );
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusedComment, setFocusedComment] = useState<any | null>(null);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [dislikedComments, setDislikedComments] = useState<Record<string, boolean>>({});
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);



  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const playFallbackSynth = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      playNote(480, now, 0.25);
      playNote(600, now + 0.1, 0.25);
      playNote(720, now + 0.2, 0.4);
    } catch (e) {
      console.error("Web Audio fallback error:", e);
    }
  };

  const handlePlayToggle = () => {
    if (!synthRef.current) {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        playFallbackSynth();
        setTimeout(() => setIsPlaying(false), 4000);
      }
      return;
    }

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      synthRef.current.cancel();
      
      const text = "Halo, saya adalah narasumber liputan investigasi Sin Po Media. Melalui rekaman suara digital eksklusif ini, saya menyampaikan fakta yang sebenar-benarnya tanpa rekayasa demi transparansi informasi publik.";
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voices = synthRef.current.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      }
      utterance.rate = 0.95;

      utterance.onend = () => {
        setIsPlaying(false);
      };
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        setIsPlaying(false);
      };

      playFallbackSynth();
      synthRef.current.speak(utterance);
    }
  };

  return (
    <aside id="editorial-sidebar" className="flex flex-col gap-8">

      {showSearchBanners && (
        <div 
          className="hidden md:flex w-full bg-slate-900 text-white rounded-[5px] border-[3px] border-brand-red-600 dark:border-brand-red-500 shadow-xl p-5 flex-col gap-4 relative overflow-hidden select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mb-1">
            <div className="flex flex-col">
              <h2 className="font-sans text-2xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
                BONGKAR
              </h2>
            </div>
            
            {/* Circle Refresh Button */}
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="w-8 h-8 rounded-full bg-brand-red-600 hover:bg-brand-red-700 text-white flex items-center justify-center cursor-pointer transition-all duration-300 hover:rotate-180 active:scale-90 shadow-md"
              title="Segarkan Tampilan"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Animated BONGKAR item */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`bongkar-search-${refreshKey}`}
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4 justify-center"
            >
              {(() => {
                const bongkarArticle = articles.find(a => a.category.toUpperCase() === 'BONGKAR' || a.isInvestigative) || articles[0];
                if (!bongkarArticle) return null;
                return (
                  <div
                    onClick={() => onSelectArticle?.(bongkarArticle)}
                    className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                      <img
                        src={bongkarArticle.imageUrl}
                        alt={bongkarArticle.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>
                    <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                      {bongkarArticle.title}
                    </h4>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Static Title of SIN PO DULU */}
          <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mt-4 mb-1">
            <div className="flex flex-col">
              <h2 className="font-sans text-2xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
                SIN PO DULU
              </h2>
            </div>
          </div>

          {/* Animated SIN PO DULU item */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`sinpodulu-search-${refreshKey}`}
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4 justify-center"
            >
              {(() => {
                const sinpoDuluArticle = articles.find(a => a.category.toUpperCase() === 'SIN PO DULU') || articles[1] || articles[0];
                if (!sinpoDuluArticle) return null;
                return (
                  <div
                    onClick={() => onSelectArticle?.(sinpoDuluArticle)}
                    className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                      <img
                        src={sinpoDuluArticle.imageUrl}
                        alt={sinpoDuluArticle.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>
                    <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                      {sinpoDuluArticle.title}
                    </h4>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* 1. TERPOPULER (Most Popular List) */}
      <section id="sidebar-popular-news" className="hidden md:block bg-white dark:bg-slate-950 p-6 rounded-[5px] border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
          <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
            BERITA TERPOPULER
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          {(() => {
            const listToRender = (popularArticles && popularArticles.length > 0)
              ? popularArticles
              : (articles && articles.length > 0)
              ? articles.slice(0, 5)
              : [];

            if (listToRender.length === 0) {
              return (
                <p className="text-xs text-slate-400 font-sans italic py-2">
                  Belum ada berita terpopuler.
                </p>
              );
            }

            return listToRender.map((pop, index) => {
              const numStr = String(index + 1).padStart(2, '0');
              const imageUrl = pop.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80";

              const handleClick = () => {
                if (onSelectArticle) {
                  onSelectArticle(pop);
                } else {
                  onSelectPopular(pop.id);
                }
              };

              if (variant === 'detail') {
                if (index === 0) {
                  return (
                    <div
                      key={pop.id}
                      onClick={handleClick}
                      className="group cursor-pointer flex flex-col gap-2.5 border-b border-slate-100 dark:border-slate-900/50 pb-4"
                    >
                      <div className="w-full aspect-[16/9] overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                        <img
                          src={imageUrl}
                          alt={pop.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors">
                          {pop.title}
                        </h4>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            {pop.category}
                          </span>
                          <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                            {pop.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={pop.id}
                    onClick={handleClick}
                    className="flex gap-3 items-center group cursor-pointer border-b border-slate-100 dark:border-slate-900/50 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="w-16 h-16 shrink-0 aspect-square overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                      <img
                        src={imageUrl}
                        alt={pop.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase leading-none">
                        {pop.category}
                      </span>
                      <h4 className="font-sans text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors line-clamp-2">
                        {pop.title}
                      </h4>
                      <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">
                        {pop.date}
                      </span>
                    </div>
                  </div>
                );
              }

              // Otherwise, variant === 'home' style
              return (
                <div
                  key={pop.id}
                  onClick={handleClick}
                  className="flex gap-3 items-start group cursor-pointer border-b border-slate-100 dark:border-slate-900/50 pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="font-sans font-extrabold text-3xl md:text-4xl text-brand-red-600 tracking-tight leading-none shrink-0 opacity-50 group-hover:opacity-100 transition-opacity select-none w-9 md:w-11 tabular-nums">
                    {numStr}
                  </span>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                      {pop.category}
                    </span>
                    <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors">
                      {pop.title}
                    </h4>
                    <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {pop.date}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {!hideExtraWidgets && !showSearchBanners && (
        <>
          {/* 2. EDITORIAL / ADVERTISING PORTRAIT POSTER */}
          <div className="hidden md:block relative overflow-hidden rounded-[5px] border border-slate-200 dark:border-slate-800 shadow-sm group">
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-[5px]">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=800"
                alt="Sin Po Editorial Poster"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] rounded-[5px]"
              />
              {/* Elegant overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent rounded-[5px]" />
              
              {/* Text content overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col gap-1.5 text-white">
                <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-slate-300">
                  SIN PO MEDIA
                </span>
                <h4 className="font-sans text-lg font-extrabold leading-snug tracking-tight text-white group-hover:text-brand-red-500 transition-colors">
                  Suara Independen, Fakta Tanpa Kompromi
                </h4>
              </div>
            </div>
          </div>

          {/* 3. SUARA DIGITAL REDAKSI (AUDIO WAVE PLAYER) */}
          <section id="sidebar-voice-digital" className="hidden md:flex flex-col gap-3">
            <style>{`
              @keyframes audio-wave-bounce {
                0%, 100% { transform: scaleY(0.18); }
                50% { transform: scaleY(1); }
              }
              .animate-wave-bar {
                animation: audio-wave-bounce 0.8s ease-in-out infinite;
              }
            `}</style>

            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-1">
              <h3 className="font-sans text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-brand-red-600 animate-pulse" /> SUARA REDAKSI
              </h3>
            </div>

            {/* Landscape rectangular player card: bg putih, radius 5 (rounded-[5px]) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[5px] p-4 flex items-center justify-between gap-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
              
              {/* Left: Play/Pause button and text info */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handlePlayToggle}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 text-white shadow-sm shrink-0 ${
                    isPlaying 
                      ? 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-850' 
                      : 'bg-brand-red-600 hover:bg-brand-red-700'
                  }`}
                  title={isPlaying ? "Jeda Suara" : "Putar Suara"}
                >
                  {isPlaying ? (
                    <Pause className="h-4.5 w-4.5 fill-current text-white" />
                  ) : (
                    <Play className="h-4.5 w-4.5 fill-current text-white translate-x-[1px]" />
                  )}
                </button>
                
                <div className="flex flex-col justify-center">
                  <span className="font-sans text-[9px] font-black uppercase tracking-widest text-brand-red-600">
                    {isPlaying ? "SEDANG DIPUTAR" : "REKAMAN PERNYATAAN"}
                  </span>
                  <span className="font-sans text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    Suara Narasumber
                  </span>
                  <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                    Investigasi Sin Po
                  </span>
                </div>
              </div>

              {/* Right: Audio wave (gelombang radio) */}
              <div className="flex items-center gap-[3px] h-10 w-24 sm:w-28 justify-end overflow-hidden px-1 shrink">
                {Array.from({ length: 14 }).map((_, i) => {
                  // Create dynamic wave height variation
                  const baseHeight = [12, 24, 32, 14, 20, 28, 16, 22, 30, 15, 26, 12, 18, 10][i % 14];
                  const delay = (i % 5) * 0.12;
                  return (
                    <div
                      key={i}
                      className={`w-[3px] rounded-full transition-all duration-300 origin-center ${
                        isPlaying 
                          ? 'bg-brand-red-600 animate-wave-bar' 
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      style={{
                        height: `${baseHeight}px`,
                        animationDelay: `${delay}s`,
                        animationDuration: '0.7s',
                        transformOrigin: 'center',
                      }}
                    />
                  );
                })}
              </div>

            </div>
          </section>

          {/* 4. KOMENTAR PEMBACA (HORIZONTAL MARQUEE WITH LOCAL FOCUS OPTION) */}
          <section id="sidebar-komentar-pembaca" className="hidden md:flex flex-col gap-3 mt-2 overflow-hidden">
            <style>{`
              @keyframes marquee-scroll {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
              }
              .animate-marquee-scroll {
                display: flex;
                width: max-content;
                animation: marquee-scroll 24s linear infinite;
              }
              .marquee-container:hover .animate-marquee-scroll {
                animation-play-state: paused;
              }
            `}</style>

            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-1">
              <h3 className="font-sans text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-brand-red-600" /> KOMENTAR PEMBACA
              </h3>
            </div>

            {/* Marquee wrapper with transparent background and left/right fade gradients */}
            <div className="marquee-container overflow-hidden w-full relative py-1 bg-transparent select-none">
              {/* Fade overlays */}
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r from-slate-50 via-slate-50/40 to-transparent dark:from-slate-950 dark:via-slate-950/40" />
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l from-slate-50 via-slate-50/40 to-transparent dark:from-slate-950 dark:via-slate-950/40" />

              {/* Flex row rendered twice for continuous wrapping scroll with precise outer padding layout */}
              <div className="animate-marquee-scroll">
                {(() => {
                  const extractedComments = (articles || []).flatMap(a => (a.comments || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    avatar: c.name.substring(0, 2).toUpperCase(),
                    comment: c.commentText,
                    time: c.date
                  })));

                  const commentsList = extractedComments.length > 0 ? extractedComments : [
                    {
                      id: 'c1',
                      name: "Pembaca SinPo",
                      avatar: "PS",
                      comment: "Berita aktual dan terpercaya. Sangat membantu mengikuti perkembangan informasi terkini.",
                      time: "Baru saja"
                    }
                  ];

                  const doubleList = [...commentsList, ...commentsList];

                  return doubleList.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="pr-4 shrink-0">
                      <div 
                        className="w-[280px] h-[135px] flex flex-col gap-3 bg-transparent border border-slate-200 dark:border-slate-800 rounded-[5px] p-3.5 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 cursor-default hover:bg-slate-100/50 dark:hover:bg-slate-900/50 select-none"
                      >
                        {/* Header: Avatar, Name & Timestamp */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-red-100 dark:bg-brand-red-950/50 border border-brand-red-200 dark:border-brand-red-900 flex items-center justify-center shrink-0">
                            <span className="font-sans text-[10px] font-extrabold text-brand-red-600 dark:text-brand-red-400">
                              {item.avatar}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-sans text-[11px] font-bold text-slate-950 dark:text-slate-100 truncate">
                              {item.name}
                            </span>
                            <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                              {item.time}
                            </span>
                          </div>
                        </div>

                        {/* Comment details */}
                        <p className="font-sans text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic whitespace-normal break-words line-clamp-3 flex-1">
                          "{item.comment}"
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </section>
        </>
      )}

    </aside>
  );
}
