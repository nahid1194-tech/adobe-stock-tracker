import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchCreatorAssets, fetchCreatorSearchLinks, fetchCreatorStats } from '@/lib/api';
import { buildQuickFilterPreset } from '@/lib/quickFilters';
import type {
  ApiError,
  Asset,
  ContentTypeFilter,
  CreatorSearchLinks,
  CreatorStats,
  FilterOption,
  ProviderMode,
  QuickFilter,
  SortOption,
  SourceStatus,
} from '@/types';

type Phase = 'idle' | 'analyzing' | 'loading' | 'loading-more' | 'loaded';

const PAGE_SIZE = 100;

/**
 * Creator dashboard state. `quickFilter` drives the preset query for the
 * quick-filter menu. "featured" is deliberately NOT fetched: the official
 * Adobe API exposes no featured flag, so the caller renders an honest
 * "not available" state instead.
 */
export function useCreatorAssets(quickFilter: QuickFilter = 'all') {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');

  const [mode, setMode] = useState<ProviderMode | null>(null);
  const [links, setLinks] = useState<CreatorSearchLinks | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const activeController = useRef<AbortController | null>(null);

  const submit = useCallback(() => {
    const id = input.trim();
    if (!id) {
      setInputError('Creator ID is required.');
      return;
    }
    if (!/^\d+$/.test(id)) {
      setInputError('Creator ID must be a numeric Adobe Stock contributor ID.');
      return;
    }
    setInputError(null);
    setCreatorId(id);
  }, [input]);

  const reset = useCallback(() => {
    activeController.current?.abort();
    setCreatorId(null);
    setMode(null);
    setLinks(null);
    setAssets([]);
    setStats(null);
    setTotal(null);
    setHasMore(false);
    setPage(0);
    setSourceStatus(null);
    setSourceMessage(null);
    setNotice(null);
    setProvider(null);
    setError(null);
    setPhase('idle');
    setFilter('all');
    setSort('relevance');
    setContentType('all');
    setInput('');
    setInputError(null);
  }, []);

  // Resolve the provider mode + search links for the creator. In "link" mode
  // this is everything the dashboard needs; no asset data is fetched.
  useEffect(() => {
    if (!creatorId) return;
    const controller = new AbortController();
    activeController.current = controller;
    setPhase('loading');
    setError(null);
    setMode(null);
    setLinks(null);

    fetchCreatorSearchLinks(creatorId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setLinks(res);
        setMode(res.mode);
        setProvider(res.provider);
        if (res.mode === 'link') {
          setAssets([]);
          setStats(null);
          setTotal(null);
          setHasMore(false);
          setPage(0);
          setSourceStatus(null);
          setSourceMessage(null);
          setNotice(null);
          setPhase('loaded');
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err as ApiError);
        setPhase('loaded');
      });

    return () => controller.abort();
  }, [creatorId, refreshNonce]);

  // Apply the quick-filter preset to the toolbar query controls. Switching to
  // "all" restores the default relevance query; unsupported modes ("featured")
  // never touch the query so no Adobe call is made for them.
  useEffect(() => {
    if (quickFilter === 'featured') return;
    const preset = buildQuickFilterPreset(quickFilter);
    setFilter(preset.filter);
    setSort(preset.sort);
    setContentType(preset.contentType);
  }, [quickFilter]);

  // In "api" mode: fetch page 1 + stats whenever the query changes.
  useEffect(() => {
    if (!creatorId) return;
    if (mode !== 'api') return;
    if (quickFilter === 'featured') {
      // No Adobe query exists for "featured" — the caller shows an honest
      // "not available" state. Never fabricate a request.
      setAssets([]);
      setTotal(null);
      setHasMore(false);
      setPage(0);
      setSourceStatus(null);
      setSourceMessage(null);
      setNotice(null);
      setPhase('loaded');
      return;
    }
    const controller = new AbortController();
    activeController.current = controller;
    setPhase('loading');
    setError(null);
    setAssets([]);
    setPage(0);

    fetchCreatorAssets(creatorId, { filter, sort, contentType, page: 1, limit: PAGE_SIZE }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setAssets(res.assets);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
        setSourceStatus(res.source);
        setSourceMessage(res.sourceMessage ?? null);
        setNotice(res.notice ?? null);
        setProvider(res.provider ?? null);
        setPhase('loaded');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err as ApiError);
        setPhase('loaded');
      });

    fetchCreatorStats(creatorId, controller.signal).then(setStats).catch(() => {
      // Stats are best-effort; the grid still renders.
    });

    return () => controller.abort();
  }, [creatorId, mode, quickFilter, filter, sort, contentType, refreshNonce]);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  /** Fetch a specific page (1-based) and REPLACE the loaded assets. */
  const goToPage = useCallback(
    (targetPage: number) => {
      if (mode !== 'api') return;
      if (!creatorId || phase === 'loading' || phase === 'loading-more' || phase === 'analyzing') return;
      const safePage = Math.max(1, Math.floor(targetPage));
      const controller = new AbortController();
      activeController.current = controller;
      setPhase('loading');

      fetchCreatorAssets(creatorId, { filter, sort, contentType, page: safePage, limit: PAGE_SIZE }, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          setAssets(res.assets);
          setTotal(res.total);
          setHasMore(res.hasMore);
          setPage(res.page);
          setSourceStatus(res.source);
          setSourceMessage(res.sourceMessage ?? null);
          setNotice(res.notice ?? null);
          setProvider(res.provider ?? null);
          setPhase('loaded');
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err as ApiError);
          setPhase('loaded');
        });
    },
    [creatorId, mode, phase, filter, sort, contentType],
  );

  const changeFilter = useCallback((value: FilterOption) => setFilter(value), []);
  const changeSort = useCallback((value: SortOption) => setSort(value), []);
  const changeContentType = useCallback((value: ContentTypeFilter) => setContentType(value), []);

  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    input,
    setInput,
    inputError,
    submit,
    reset,
    creatorId,
    mode,
    links,
    filter,
    sort,
    contentType,
    changeFilter,
    changeSort,
    changeContentType,
    assets,
    stats,
    total,
    hasMore,
    page,
    totalPages,
    sourceStatus,
    sourceMessage,
    notice,
    provider,
    phase,
    error,
    goToPage,
    refresh,
  };
}
