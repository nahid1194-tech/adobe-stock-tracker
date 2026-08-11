import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QUICK_FILTER_DEFINITIONS } from '@/lib/quickFilters';
import type { QuickFilter } from '@/types';

/**
 * Creator quick-filter menu: All Assets / Recent Approved / Featured /
 * Downloads / Recently Observed.
 *
 * Modes map to honest Adobe queries (buildQuickFilterPreset). "Featured" is
 * listed because contributors expect it, but it is not backed by the Adobe
 * public API — App.tsx renders an honest "not available" state when selected.
 */
export function QuickFilterBar({
  value,
  onChange,
  disabled = false,
}: {
  value: QuickFilter;
  onChange: (mode: QuickFilter) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-x-auto pb-1" aria-label="Quick filters">
      <Tabs value={value} onValueChange={(v) => onChange(v as QuickFilter)}>
        <TabsList className="h-10 w-max gap-0.5 bg-muted/60 px-1">
          {QUICK_FILTER_DEFINITIONS.map((d) => (
            <TabsTrigger
              key={d.mode}
              value={d.mode}
              disabled={disabled}
              title={d.description}
              className="px-3.5 text-sm data-[state=active]:bg-background"
            >
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
