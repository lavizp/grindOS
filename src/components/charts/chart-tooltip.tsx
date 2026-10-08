import type { ReactNode } from 'react'

interface ChartTooltipProps {
  active?: boolean
  label?: ReactNode
  payload?: ReadonlyArray<{ value?: unknown; name?: unknown; color?: string }>
  formatValue: (value: number) => string
  formatLabel?: (label: string) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const title = typeof label === 'string' && formatLabel ? formatLabel(label) : label

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      {title !== undefined && title !== '' && (
        <p className="mb-0.5 text-muted-foreground">{title}</p>
      )}
      {payload.map((item, index) => (
        <p key={index} className="tabular flex items-center gap-2 font-medium">
          {payload.length > 1 && (
            <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden />
          )}
          {formatValue(Number(item.value))}
        </p>
      ))}
    </div>
  )
}
