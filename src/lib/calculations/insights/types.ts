import type { Category, Exercise, Payment, Settings, Sleep, Workout } from '@/db/schema'
import type { DayKey } from '@/lib/dates'
import type { Domain } from '@/lib/domains'

// Insights are short, rule-based observations. Every rule is a pure function
// with its own minimum-data threshold: with too little data it says nothing
// rather than something unreliable.

export type InsightDomain = Domain | 'cross'
export type InsightSeverity = 'positive' | 'neutral' | 'warning'

export interface Insight {
  /** Stable for the same finding, e.g. "spending-category-up-cat_food". */
  id: string
  domain: InsightDomain
  severity: InsightSeverity
  /** Higher shows first. Roughly 0–100. */
  priority: number
  title: string
  detail?: string
  /** Where to look closer. */
  link?: string
}

/** Everything the rules look at. Lists may be in any order. */
export interface InsightData {
  workouts: Workout[]
  sleep: Sleep[]
  payments: Payment[]
  categories: Category[]
  exercises: Exercise[]
}

export type InsightSettings = Pick<
  Settings,
  'currency' | 'weightUnit' | 'weekStartsOn' | 'sleepTargetMin'
>

export interface InsightContext {
  data: InsightData
  today: DayKey
  settings: InsightSettings
}

export type InsightRule = (context: InsightContext) => Insight[]

/** How far back the rules ever look. Load at least this much. */
export const INSIGHT_LOOKBACK_DAYS = 365
