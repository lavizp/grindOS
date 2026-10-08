import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

export interface DonutSlice {
  key: string
  name: string
  value: number
  color: string
}

interface CategoryDonutProps {
  data: DonutSlice[]
  /** Text in the middle, usually the total. */
  center?: ReactNode
  size?: number
}

export function CategoryDonut({ data, center, size = 180 }: CategoryDonutProps) {
  const slices = data.filter((d) => d.value > 0)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={
              slices.length ? slices : [{ key: 'empty', name: '', value: 1, color: 'var(--muted)' }]
            }
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="none"
            isAnimationActive={false}
          >
            {(slices.length ? slices : [{ key: 'empty', color: 'var(--muted)' }]).map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}
