import { CategoryDonut } from '@/components/charts'
import type { Category, ID } from '@/db/schema'
import { CategoryIcon } from '@/features/spending/category-icon'
import type { CategoryTotal } from '@/lib/calculations/spending'
import { formatMoney } from '@/lib/money'

interface CategoryBreakdownProps {
  totals: CategoryTotal[]
  categories: Map<ID, Category>
  totalMinor: number
  currency: string
}

const FALLBACK = { name: 'Unknown category', icon: 'circle-ellipsis', color: '#64748b' }

/** Donut for the overall shape, ranked bars for the exact numbers. */
export function CategoryBreakdown({
  totals,
  categories,
  totalMinor,
  currency,
}: CategoryBreakdownProps) {
  const rows = totals.map((t) => ({ ...t, category: categories.get(t.categoryId) ?? FALLBACK }))

  return (
    <div className="flex flex-col gap-5">
      <CategoryDonut
        size={168}
        data={rows.map((r) => ({
          key: r.categoryId,
          name: r.category.name,
          value: r.totalMinor,
          color: r.category.color,
        }))}
        center={
          <span>
            <span className="tabular block font-heading text-xl font-semibold">
              {formatMoney(totalMinor, currency, { compact: totalMinor >= 10_000_000 })}
            </span>
            <span className="block text-xs text-muted-foreground">
              {rows.length === 1 ? '1 category' : `${rows.length} categories`}
            </span>
          </span>
        }
      />
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.categoryId} className="flex items-center gap-3">
            <CategoryIcon icon={row.category.icon} color={row.category.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{row.category.name}</span>
                <span className="tabular shrink-0">
                  {formatMoney(row.totalMinor, currency)}
                  <span className="ml-1.5 inline-block w-9 text-right text-muted-foreground">
                    {Math.round(row.share * 100)}%
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(row.share * 100, 1.5)}%`,
                    background: row.category.color,
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
