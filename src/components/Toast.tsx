"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-5 py-3 text-white shadow-xl dark:bg-slate-800 border border-slate-700/50"
        >
          {type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-brand-gold shrink-0" />
          )}
          <span className="font-sans text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
