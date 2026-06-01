import type { Metadata } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { cookies, headers } from 'next/headers';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';

export const metadata: Metadata = {
  title: 'HRIS — Attendance',
  description: 'Multi-tenant HRIS Attendance System',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read locale from cookie directly (bypass middleware issue)
  const cookieStore = await cookies();
  const headerLocale = (await headers()).get('Accept-Language') || '';
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value || '';
  
  // cookie > Accept-Language > default
  let locale = 'id';
  if (cookieLocale === 'en' || cookieLocale === 'id') {
    locale = cookieLocale;
  } else if (headerLocale.startsWith('en')) {
    locale = 'en';
  }

  // Dynamic import messages based on locale
  let messages: Record<string, unknown> = {};
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/id.json`)).default;
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
