import type { ReactNode } from 'react'

interface SettingsRowProps {
  /** The visible label; pass `htmlFor` when the control is a form field. */
  label: ReactNode
  htmlFor?: string
  labelId?: string
  /** Supporting text under the row. */
  hint?: ReactNode
  children: ReactNode
}

/** Label on the left and control on the right, with any hint underneath both. */
export function SettingsRow({ label, htmlFor, labelId, hint, children }: SettingsRowProps) {
  const Label = htmlFor ? 'label' : 'span'
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <Label id={labelId} htmlFor={htmlFor} className="min-w-0 font-medium">
          {label}
        </Label>
        <div className="shrink-0">{children}</div>
      </div>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
