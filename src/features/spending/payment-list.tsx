import { Link } from 'react-router'
import type { Category, ID, Payment } from '@/db/schema'
import { CategoryIcon } from '@/features/spending/category-icon'
import { groupByDay } from '@/lib/calculations/spending'
import { formatRelativeDay } from '@/lib/formatters'
import { formatMoney } from '@/lib/money'

interface PaymentRowProps {
  payment: Payment
  category: Category | undefined
  currency: string
  /** Show the date under the title (for lists not grouped by day). */
  showDate?: boolean
}

export function PaymentRow({ payment, category, currency, showDate = false }: PaymentRowProps) {
  const categoryName = category?.name ?? 'Unknown category'
  const title = payment.merchant ?? categoryName
  const details = [
    payment.merchant ? categoryName : undefined,
    showDate ? formatRelativeDay(payment.date) : undefined,
    payment.notes,
  ].filter(Boolean)

  return (
    <Link
      to={`/spending/${payment.id}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
    >
      <CategoryIcon
        icon={category?.icon ?? 'circle-ellipsis'}
        color={category?.color ?? '#64748b'}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {details.length > 0 && (
          <span className="block truncate text-sm text-muted-foreground">{details.join(', ')}</span>
        )}
      </span>
      <span className="tabular shrink-0 font-medium">
        {formatMoney(payment.amountMinor, currency)}
      </span>
    </Link>
  )
}

interface PaymentDayListProps {
  payments: Payment[]
  categories: Map<ID, Category>
  currency: string
}

/** Every payment, grouped under a day heading with that day's total. */
export function PaymentDayList({ payments, categories, currency }: PaymentDayListProps) {
  return (
    <div className="flex flex-col gap-4">
      {groupByDay(payments).map((day) => (
        <section key={day.date} aria-labelledby={`day-${day.date}`}>
          <div className="mb-1 flex items-baseline justify-between text-sm text-muted-foreground">
            <h3 id={`day-${day.date}`} className="font-sans font-medium">
              {formatRelativeDay(day.date)}
            </h3>
            <span className="tabular">{formatMoney(day.totalMinor, currency)}</span>
          </div>
          <ul>
            {day.payments.map((payment) => (
              <li key={payment.id}>
                <PaymentRow
                  payment={payment}
                  category={categories.get(payment.categoryId)}
                  currency={currency}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
