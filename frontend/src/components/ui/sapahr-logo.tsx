'use client';

import React from 'react';

interface SapaHRLogoProps {
  variant?: 'icon' | 'horizontal';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SapaHRLogo({ variant = 'horizontal', className = '', size = 'md' }: SapaHRLogoProps) {
  const iconSizes = { sm: 28, md: 36, lg: 48 };
  const textSizes = { sm: '13px' as const, md: '17px' as const, lg: '22px' as const };

  if (variant === 'icon') {
    const px = iconSizes[size];
    return (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={px} height={px} className={className}>
        <defs>
          <linearGradient id="sapa-icon-new" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
        </defs>
        <rect width="80" height="80" rx="18" fill="url(#sapa-icon-new)"/>
        <path d="M30 52 C30 44, 32 38, 36 34 C40 30, 44 28, 46 26 C48 24, 48 20, 46 18 C44 16, 40 17, 38 20 C36 23, 34 28, 32 32"
              stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M24 50 C24 42, 26 36, 30 32 C34 28, 38 25, 40 23"
              stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M48 16 C50 14, 52 14, 53 16 C54 18, 53 20, 51 22"
              stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M54 22 C58 26, 60 32, 60 40" stroke="#e0e7ff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3"/>
        <path d="M28 56 L26 52" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M32 56 L30 50" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3"/>
      </svg>
    );
  }

  const iconPx = iconSizes[size];
  const textSize = textSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} style={{ lineHeight: 1 }}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={iconPx} height={iconPx} className="flex-shrink-0">
        <defs>
          <linearGradient id="sapa-hz-new" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#sapa-hz-new)"/>
        <path d="M22 46 C22 38, 24 32, 27 28 C30 24, 33 22, 35 20 C37 18, 37 15, 35 13 C33 11, 30 12, 28 15 C26 18, 25 22, 23 26"
              stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path d="M18 44 C18 36, 20 30, 23 26 C26 22, 29 20, 31 18"
              stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
        <path d="M38 11.5 C39.5 10, 41 10, 41.5 11.5 C42 13, 41 14.5, 39.5 16"
              stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M43 16 C45 19, 46 24, 46 30" stroke="#e0e7ff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.2"/>
      </svg>
      <div className="font-bold" style={{
        fontSize: textSize,
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '-0.3px',
        color: '#1a1a2e',
        lineHeight: 1,
      }}>
        sapa<span style={{ color: '#4f46e5' }}>HR</span>
      </div>
    </div>
  );
}
