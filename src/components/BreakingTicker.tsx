"use client";

import React from 'react';
import { BREAKING_NEWS } from '../data/newsData';
import { motion, AnimatePresence } from 'motion/react';

interface BreakingTickerProps {
  items?: string[];
}

export default function BreakingTicker({ items }: BreakingTickerProps) {
  const newsItems = (items && items.length > 0) ? items : BREAKING_NEWS;
  const [showDate, setShowDate] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isPaused, setIsPaused] = React.useState(false);

  // Update current time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flip state every 10 seconds
  React.useEffect(() => {
    const flipTimer = setInterval(() => {
      setShowDate(prev => !prev);
    }, 10000);
    return () => clearInterval(flipTimer);
  }, []);

  // Format current date in high-fidelity Indonesian style
  const getIndonesianDay = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return `${days[date.getDay()]},`;
  };

  const getIndonesianDateOnly = (date: Date) => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getFormattedTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div id="breaking-news-bar" className="bg-slate-900 text-white text-xs border-b border-slate-800 flex items-center h-10 px-4 md:px-8 justify-between select-none">
      {/* Left Label & Running Marquee */}
      <div className="flex items-center gap-3 overflow-hidden flex-1 mr-1 md:mr-2">
        <span className="bg-brand-red-600 px-2.5 py-1 text-[10px] font-bold font-sans tracking-wider flex items-center gap-1.5 shrink-0 uppercase rounded-sm">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          SIN PO TV
        </span>
        
        {/* Hardware-accelerated CSS marquee with hover pause */}
        <div className="w-full overflow-hidden text-slate-300 font-sans tracking-wide relative flex items-center">
          {/* Left Gradient Fade */}
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
          
          <div 
            className="animate-marquee-scroll cursor-pointer flex whitespace-nowrap"
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Track 1 */}
            <div className="flex shrink-0">
              {newsItems.map((news, idx) => (
                <span key={`t1-${idx}`} className="mx-8 hover:text-brand-gold transition-colors font-medium shrink-0">
                  • {news}
                </span>
              ))}
            </div>
            {/* Track 2 (seamless clone) */}
            <div className="flex shrink-0">
              {newsItems.map((news, idx) => (
                <span key={`t2-${idx}`} className="mx-8 hover:text-brand-gold transition-colors font-medium shrink-0">
                  • {news}
                </span>
              ))}
            </div>
          </div>

          {/* Right Gradient Fade */}
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
        </div>
      </div>

      {/* Right Date and Toggle */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="font-sans tracking-wide font-medium text-slate-300 hidden sm:flex items-center h-5 overflow-hidden justify-start gap-1.5">
          <span className="text-slate-400 font-bold shrink-0">{getIndonesianDay(currentTime)}</span>
          <div className="relative h-5 overflow-hidden flex items-center justify-start">
            <AnimatePresence mode="wait">
              <motion.span
                key={showDate ? 'date' : 'time'}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="inline-block origin-center whitespace-nowrap text-left"
              >
                {showDate ? getIndonesianDateOnly(currentTime) : getFormattedTime(currentTime)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
