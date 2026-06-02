'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchMyAssets, type AssetAssignment } from '@/lib/api-assets';
import { Briefcase, Calendar, RefreshCw, ArrowLeftRight } from 'lucide-react';

const conditionColor: Record<string, string> = {
  good: 'bg-success/10 text-success border-success/20',
  fair: 'bg-warning/10 text-warning border-warning/20',
  damaged: 'bg-danger/10 text-danger border-danger/20',
};

export default function MyAssetsPage() {
  const t = useTranslations('nav.assets');
  const te = useTranslations('errors');
  const { user } = useAuth();

  const [assets, setAssets] = useState<AssetAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMyAssets();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : te('fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [te]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            {t('myAssets')}
          </h2>
          <p className="text-muted-foreground mt-1">{t('myAssetsDesc')}</p>
        </div>
        <Button variant="outline" onClick={loadAssets} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Empty */}
      {!isLoading && assets.length === 0 && (
        <EmptyState
          icon={<Briefcase className="h-12 w-12 text-muted-foreground/40" />}
          title="No assets assigned to you"
        />
      )}

      {/* Asset List */}
      {!isLoading && assets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((a) => (
            <Card key={a.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground truncate">{a.asset_name || 'Asset'}</h3>
                      <Badge variant="info" className="text-xs">{a.asset_code || '—'}</Badge>
                    </div>

                    <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {t('assignedAt')}: {a.assigned_at || '—'}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Badge
                        variant="default"
                        className={conditionColor[a.condition_at_assignment] || 'bg-gray-100 text-gray-700'}
                      >
                        {a.condition_at_assignment}
                      </Badge>
                      {!a.returned_at ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                          {t('assigned')}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-gray-100 text-gray-500">
                          {t('returnedAt')}: {a.returned_at}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
