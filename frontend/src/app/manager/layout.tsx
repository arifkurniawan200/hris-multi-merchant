'use client';

import React from 'react';
import { ClientLayout } from '@/components/layout/client-layout';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
