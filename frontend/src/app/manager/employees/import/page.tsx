'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

interface ImportResult {
  total_rows: number;
  imported: number;
  errors: string[];
}

export default function BulkImportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('employees');
  const tc = useTranslations('common');

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  // Redirect non-managers after auth loads
  React.useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const allowedExtensions = ['.csv', '.xlsx', '.xls'];

  function validateFile(f: File): string | null {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return 'Please select a CSV or XLSX file.';
    }
    return null;
  }

  function handleFileSelected(f: File) {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/employees/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Import failed');
      }

      setResult(data.data);
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import employees');
    } finally {
      setUploading(false);
    }
  }

  if (authLoading) {
    return (
      <LoadingState variant="fullscreen" />
    );
  }

  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="active:scale-95 transition-all duration-200">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-balance text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Bulk Employee Import
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload a CSV or XLSX file to import multiple employees at once
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-base">Select File</CardTitle>
          <CardDescription>
            Supported formats: .csv, .xlsx, .xls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors
              ${dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />

            {!file ? (
              <>
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground/60 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV or XLSX files up to 10MB
                </p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-10 w-10 text-primary mb-3" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-muted-foreground active:scale-95 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError('');
                    setResult(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger mt-4 animate-slide-up">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              size="lg"
              className="active:scale-95 transition-all duration-200"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Import
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Summary */}
      {result && (
        <Card className="card-hover transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 stagger-children">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{result.total_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                <p className="text-xs text-emerald-700 mt-1">Imported</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.total_rows - result.imported}
                </p>
                <p className="text-xs text-red-700 mt-1">Failed</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Errors ({result.errors.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((errMsg, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700"
                    >
                      <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{errMsg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => { setResult(null); setFile(null); }} className="active:scale-95 transition-all duration-200">
                Import Another File
              </Button>
              <Button onClick={() => router.push('/manager/employees')} className="active:scale-95 transition-all duration-200">
                View Employees
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
