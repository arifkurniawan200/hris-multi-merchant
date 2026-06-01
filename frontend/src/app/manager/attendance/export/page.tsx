'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface PreviewResponse {
  count: number;
}

export default function AttendanceExportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  React.useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const fetchPreview = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    setLoadingPreview(true);
    setError('');
    try {
      const data = await api.get<PreviewResponse>(
        `/api/v1/attendance/export/preview?date_from=${dateFrom}&date_to=${dateTo}`
      );
      setPreviewCount(data.count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      setPreviewCount(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [dateFrom, dateTo]);

  // Auto-fetch preview when dates change, with debounce
  React.useEffect(() => {
    if (!dateFrom || !dateTo || !isManager) return;
    const timer = setTimeout(() => fetchPreview(), 300);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, fetchPreview, isManager]);

  async function handleExport() {
    if (!dateFrom || !dateTo) {
      setError('Please select a date range');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const url = `/api/v1/attendance/export?date_from=${dateFrom}&date_to=${dateTo}&format=${format}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Export failed (${res.status})`);
      }

      // Get filename from Content-Disposition header or use default
      const disposition = res.headers.get('Content-Disposition');
      let filename: string;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        filename = match?.[1]?.replace(/['"]/g, '') || `attendance_export.${format}`;
      } else {
        filename = `attendance_${dateFrom}_to_${dateTo}.${format}`;
      }

      // Download as blob
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export attendance');
    } finally {
      setExporting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isManager) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Download className="h-6 w-6" />
            Attendance Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Export attendance records for a date range in CSV or XLSX format
          </p>
        </div>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Export Settings
          </CardTitle>
          <CardDescription>
            Choose the date range and output format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="date-from"
                className="text-sm font-medium text-foreground"
              >
                Date From
              </label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="date-to"
                className="text-sm font-medium text-foreground"
              >
                Date To
              </label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Export Format
            </label>
            <div className="flex gap-4">
              <label
                className={`
                  flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors flex-1
                  ${format === 'csv'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                  }
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="sr-only"
                />
                <FileText className={`h-6 w-6 ${format === 'csv' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Comma-separated values file
                  </p>
                </div>
              </label>

              <label
                className={`
                  flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors flex-1
                  ${format === 'xlsx'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                  }
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="sr-only"
                />
                <FileSpreadsheet className={`h-6 w-6 ${format === 'xlsx' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">XLSX</p>
                  <p className="text-xs text-muted-foreground">
                    Excel spreadsheet file
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Count */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Records to export
              </span>
              <span className="text-sm text-muted-foreground">
                {dateFrom} — {dateTo}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </div>
              ) : previewCount !== null ? (
                <>
                  <span className="text-3xl font-bold text-foreground">
                    {previewCount}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {previewCount === 1 ? 'record' : 'records'} found
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Select dates to see preview
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={!dateFrom || !dateTo || exporting || loadingPreview}
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {previewCount !== null ? `(${previewCount} records)` : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
