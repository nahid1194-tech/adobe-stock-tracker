import type { ContentTypeFilter, FilterOption, QuickFilter, SortOption } from '@/types';

export interface QuickFilterPreset {
  filter: FilterOption;
  sort: SortOption;
  contentType: ContentTypeFilter;
}

export interface QuickFilterDefinition {
  mode: QuickFilter;
  label: string;
  shortLabel: string;
  description: string;
  sortLabel: string;
  /** Whether this mode maps to a real query (false => honest unavailable state). */
  supported: boolean;
}

export const QUICK_FILTER_FEATURED_UNAVAILABLE_MESSAGE =
  'Featured status is not available through the Adobe Stock public API. The official Search API does not expose a featured flag or filter, so the tracker cannot show a featured list without inventing data.';

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

export const QUICK_FILTERS: ReadonlyArray<QuickFilter> = QUICK_FILTER_DEFINITIONS.map((d) => d.mode);

const DEFINITION_BY_MODE: Readonly<Record<QuickFilter, QuickFilterDefinition>> = Object.fromEntries(
  QUICK_FILTER_DEFINITIONS.map((d) => [d.mode, d]),
) as Readonly<Record<QuickFilter, QuickFilterDefinition>>;

export function getQuickFilterDefinition(mode: QuickFilter): QuickFilterDefinition {
  return DEFINITION_BY_MODE[mode];
}

/** Map a quick-filter mode to the search preset used to fetch it. */
export function buildQuickFilterPreset(mode: QuickFilter): QuickFilterPreset {
  switch (mode) {
    case 'recent-approved':
      return { filter: 'all', sort: 'creation-desc', contentType: 'all' };
    case 'downloads':
      return { filter: 'all', sort: 'downloads-desc', contentType: 'all' };
    case 'featured':
    case 'recently-observed':
    case 'all':
    default:
      return { filter: 'all', sort: 'relevance', contentType: 'all' };
  }
}
