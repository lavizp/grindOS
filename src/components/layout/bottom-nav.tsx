import { Home, Plus, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { DOMAINS } from '@/lib/domains'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  /** Active color; Home stays neutral. */
  activeText: string
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', icon: Home, activeText: 'text-foreground' },
  { ...pick('workout'), activeText: DOMAINS.workout.text },
  { ...pick('sleep'), activeText: DOMAINS.sleep.text },
  { ...pick('spending'), activeText: DOMAINS.spending.text },
]

function pick(domain: keyof typeof DOMAINS) {
  const { path, label, icon } = DOMAINS[domain]
  return { to: path, label, icon }
}

function TabLink({ tab }: { tab: Tab }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.to}
      end={tab.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && tab.activeText,
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
          <span>{tab.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]"
    >
      <div className="mx-auto flex max-w-lg items-center gap-1 rounded-full border bg-card/90 p-1.5 shadow-[0_8px_30px_-12px_rgb(21_23_28/0.35)] backdrop-blur-xl">
        <TabLink tab={TABS[0]} />
        <TabLink tab={TABS[1]} />
        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Add entry"
          className="mx-1 grid size-14 shrink-0 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform outline-none focus-visible:ring-ring active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.4} aria-hidden />
        </button>
        <TabLink tab={TABS[2]} />
        <TabLink tab={TABS[3]} />
      </div>
    </nav>
  )
}
