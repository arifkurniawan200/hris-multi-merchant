'use client';

import React from 'react';
import { ClientLayout } from '@/components/layout/client-layout';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
