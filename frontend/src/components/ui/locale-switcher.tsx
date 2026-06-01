'use client';

import React from 'react';
import { useLocale } from 'next-intl';

const LOCALES = [
  { value: 'id', label: 'ID' },
  { value: 'en', label: 'EN' },
];

export function LocaleSwitcher() {
  const locale = useLocale();

  function switchLocale(newLocale: string) {
    // next-intl with localePrefix 'never' uses cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
      {LOCALES.map((l) => (
        <button
          key={l.value}
          onClick={() => switchLocale(l.value)}
          className={`px-2 py-1 font-medium transition-colors ${
            locale === l.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
