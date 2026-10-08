import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-tooltip'
import {
  AXIS_PROPS,
  colorVar,
  GRID_PROPS,
  TOOLTIP_CURSOR,
  type ChartColor,
} from '@/components/charts/chart-theme'

export interface TrendPoint {
  /** Stable key, usually a DayKey or month key. */
  key: string
  /** Short axis label: "Mon", "12", "Sep". */
  label: string
  value: number
}

interface BarTrendProps {
  data: TrendPoint[]
  color: ChartColor
  formatValue: (value: number) => string
  /** Optional reference line, e.g. a sleep target or daily average. */
  target?: number
  /** Keys to draw at full strength; others are muted. Defaults to all. */
  highlightKey?: string
  height?: number
  showYAxis?: boolean
}

export function BarTrend({
  data,
  color,
  formatValue,
  target,
  highlightKey,
  height = 200,
  showYAxis = false,
}: BarTrendProps) {
  const fill = colorVar(color)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...AXIS_PROPS} hide={!showYAxis} width={44} tickFormatter={formatValue} />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                payload={payload}
                label={payload?.[0]?.payload?.key}
                formatValue={formatValue}
              />
            )}
          />
          {target !== undefined && (
            <ReferenceLine y={target} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          )}
          <Bar
            dataKey="value"
            fill={fill}
            radius={[6, 6, 2, 2]}
            maxBarSize={28}
            isAnimationActive={false}
            shape={(props: {
              x?: number
              y?: number
              width?: number
              height?: number
              payload?: TrendPoint
            }) => {
              const { x = 0, y = 0, width = 0, height: h = 0, payload } = props
              const dim = highlightKey !== undefined && payload?.key !== highlightKey
              const r = Math.min(6, width / 2, h)
              return (
                <path d={roundedTop(x, y, width, h, r)} fill={fill} fillOpacity={dim ? 0.35 : 1} />
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return ''
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
