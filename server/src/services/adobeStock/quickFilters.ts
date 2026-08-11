import type { ContentTypeFilter, FilterOption, QuickFilter, SortOption } from './adobeStockTypes';

/**
 * One quick-filter preset: the concrete search query that backs a mode.
 *
 * Centralizing the mapping here guarantees every caller (the route, and any
 * future consumer) turns a mode into the same, honest Adobe query:
 *   - recent-approved  -> order=creation   (Adobe orders by creation date;
 *                          it does not expose contributor approval dates)
 *   - downloads        -> order=nb_downloads (Adobe's documented download order)
 *   - recently-observed-> a plain all-assets fetch; the result is re-sorted by
 *                          the local last_seen_at history, never by a claim
 *                          about Adobe dates.
 *   - featured         -> unsupported; no reliable featured flag exists in the
 *                          official Search API, so callers show an honest
 *                          "not available" state instead of calling the API.
 */
export interface QuickFilterPreset {
  filter: FilterOption;
  sort: SortOption;
  contentType: ContentTypeFilter;
}

export interface QuickFilterDefinition {
  mode: QuickFilter;
  /** Primary button label. */
  label: string;
  /** Short alternative label for narrow screens. */
  shortLabel: string;
  /** One-line explanation shown under the quick-filter menu. */
  description: string;
  /** Label for the current sort state (result bar). */
  sortLabel: string;
  /** Whether this mode maps to a real query (false => honest unavailable state). */
  supported: boolean;
}

export const QUICK_FILTER_FEATURED_UNAVAILABLE_MESSAGE =
  'Featured status is not available through the Adobe Stock public API. The official Search API does not expose a featured flag or filter, so the tracker cannot show a featured list without inventing data.';

export const QUICK_FILTER_RECENT_APPROVED_NOTE =
  'Adobe does not expose contributor approval dates through the public API. Results are sorted by the latest available creation/publication data (creation date).';

export const QUICK_FILTER_RECENTLY_OBSERVED_NOTE =
  'Sorted by the last time each asset appeared in tracker results (local history). This reflects when the tracker last saw the asset, not an Adobe approval date.';

const ALL_PRESET: QuickFilterPreset = { filter: 'all', sort: 'relevance', contentType: 'all' };

export const QUICK_FILTER_DEFINITIONS: ReadonlyArray<QuickFilterDefinition> = [
  {
    mode: 'all',
    label: 'All Assets',
    shortLabel: 'All',
    description: 'All public assets for this creator, in Adobe\'s default relevance order.',
    sortLabel: 'Relevance',
    supported: true,
  },
  {
    mode: 'recent-approved',
    label: 'Recent Approved',
    shortLabel: 'Recent',
    description:
      'Adobe does not expose contributor approval dates through the public API, so this sorts by the latest available creation/publication data.',
    sortLabel: 'Creation Date',
    supported: true,
  },
  {
    mode: 'featured',
    label: 'Featured',
    shortLabel: 'Featured',
    description: 'Featured status is not available through the Adobe Stock public API.',
    sortLabel: 'Featured',
    supported: false,
  },
  {
    mode: 'downloads',
    label: 'Downloads',
    shortLabel: 'Downloads',
    description: 'Public assets ordered by download count, the metric Adobe actually exposes.',
    sortLabel: 'Most Downloaded',
    supported: true,
  },
  {
    mode: 'recently-observed',
    label: 'Recently Observed',
    shortLabel: 'Observed',
    description:
      'Assets the tracker has seen, ordered by when they last appeared locally. Not a claim about Adobe dates.',
    sortLabel: 'Recently Observed',
    supported: true,
  },
];

const DEFINITION_BY_MODE: Readonly<Record<QuickFilter, QuickFilterDefinition>> = Object.fromEntries(
  QUICK_FILTER_DEFINITIONS.map((d) => [d.mode, d]),
) as Readonly<Record<QuickFilter, QuickFilterDefinition>>;

export function getQuickFilterDefinition(mode: QuickFilter): QuickFilterDefinition {
  return DEFINITION_BY_MODE[mode];
}

/** Map a quick-filter mode to the concrete search preset used to fetch it. */
export function buildAdobeSearchParams(mode: QuickFilter): QuickFilterPreset {
  switch (mode) {
    case 'recent-approved':
      return { filter: 'all', sort: 'creation-desc', contentType: 'all' };
    case 'downloads':
      return { filter: 'all', sort: 'downloads-desc', contentType: 'all' };
    case 'featured':
      // Unsupported: no featured flag/filter exists in the official API.
      return ALL_PRESET;
    case 'recently-observed':
      // Fetch the same all-assets set; the result is re-sorted by local
      // last_seen_at, so the upstream order is irrelevant.
      return ALL_PRESET;
    case 'all':
    default:
      return ALL_PRESET;
  }
}
