'use client';

import { ClientLayout } from '@/components/layout/client-layout';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
