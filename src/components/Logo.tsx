"use client";

import React from 'react';
import sinpoLight from '../images/sinpo-light.png';
import sinpoDark from '../images/sinpo-dark.svg';

interface LogoProps {
  isDarkMode?: boolean;
  className?: string;
  heightClass?: string;
  alt?: string;
}

const lightSrc = typeof sinpoLight === 'object' && sinpoLight !== null && 'src' in sinpoLight ? (sinpoLight as any).src : sinpoLight;
const darkSrc = typeof sinpoDark === 'object' && sinpoDark !== null && 'src' in sinpoDark ? (sinpoDark as any).src : sinpoDark;

export default function Logo({
  isDarkMode = false,
  className = "",
  heightClass = "h-8 md:h-12",
  alt = "SinPo.id"
}: LogoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${heightClass} ${className}`}>
      {/* Light Mode Logo (sinpo-light.png) */}
      <img
        src={lightSrc}
        alt={alt}
        className={`h-full w-auto object-contain transition-opacity duration-300 ease-in-out ${
          isDarkMode ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Dark Mode Logo (sinpo-dark.svg) */}
      <img
        src={darkSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-auto object-contain transition-opacity duration-300 ease-in-out ${
          isDarkMode ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
