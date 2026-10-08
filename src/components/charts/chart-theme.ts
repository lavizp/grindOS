// Shared Recharts styling. Colors are CSS variables so charts follow the theme.

export const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
} as const

export const GRID_PROPS = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '3 3',
  vertical: false,
} as const

export const TOOLTIP_CURSOR = { fill: 'var(--muted)', opacity: 0.6 }

export type ChartColor = 'workout' | 'sleep' | 'spending' | 'foreground'

export function colorVar(color: ChartColor | string): string {
  return color.startsWith('#') || color.startsWith('var(') ? color : `var(--${color})`
}
