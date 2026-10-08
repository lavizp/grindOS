import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-tooltip'
import { AXIS_PROPS, colorVar, GRID_PROPS, type ChartColor } from '@/components/charts/chart-theme'

export interface LineSeries {
  dataKey: string
  color: ChartColor
  name?: string
}

interface LineTrendProps<T extends { label: string }> {
  data: T[]
  series: LineSeries[]
  formatValue: (value: number) => string
  /** Y domain; e.g. ['dataMin - 30', 'dataMax + 30'] for times of day. */
  domain?: [number | string, number | string]
  target?: number
  height?: number
  showYAxis?: boolean
  /** Whether lower values are drawn higher (e.g. bedtime: earlier at top). */
  reversed?: boolean
}

export function LineTrend<T extends { label: string }>({
  data,
  series,
  formatValue,
  domain = ['auto', 'auto'],
  target,
  height = 200,
  showYAxis = true,
  reversed = false,
}: LineTrendProps<T>) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis
            {...AXIS_PROPS}
            hide={!showYAxis}
            width={48}
            domain={domain}
            reversed={reversed}
            tickFormatter={formatValue}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload}
                label={label}
                formatValue={formatValue}
              />
            )}
          />
          {target !== undefined && (
            <ReferenceLine y={target} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          )}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={colorVar(s.color)}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
