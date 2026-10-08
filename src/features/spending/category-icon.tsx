import { CircleEllipsis } from 'lucide-react'
import { CATEGORY_ICONS } from '@/features/spending/category-icons'
import { cn } from '@/lib/utils'

interface CategoryIconProps {
  icon: string
  color: string
  /** Tile size; the glyph scales with it. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { tile: 'size-8 rounded-lg', glyph: 'size-4' },
  md: { tile: 'size-10 rounded-xl', glyph: 'size-5' },
  lg: { tile: 'size-12 rounded-xl', glyph: 'size-6' },
}

/** The category's icon on a tile tinted with its color. */
export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon] ?? CircleEllipsis
  return (
    <span
      className={cn('grid shrink-0 place-items-center', SIZES[size].tile, className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
    >
      <Icon className={SIZES[size].glyph} aria-hidden />
    </span>
  )
}
