import type { ReactNode } from 'react'
import { ToggleGroup } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  /** Name the group with one of these. */
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

/**
 * A choice of one, shown as a row of segments (Week/Month, kg/lb). Unlike
 * tabs it controls a value, not panels, so it's announced as a set of
 * options; arrow keys move between them.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...labels
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Tapping the selected segment would clear it; a choice of one always has a value.
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn(
        'inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
        className,
      )}
      {...labels}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="touch-target relative inline-flex h-full flex-1 items-center justify-center rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:text-muted-foreground dark:hover:text-foreground dark:data-[state=on]:border-input dark:data-[state=on]:bg-input/30 dark:data-[state=on]:text-foreground"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
