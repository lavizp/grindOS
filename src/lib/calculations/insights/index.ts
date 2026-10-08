import { crossRules } from '@/lib/calculations/insights/cross'
import { sleepRules } from '@/lib/calculations/insights/sleep'
import { spendingRules } from '@/lib/calculations/insights/spending'
import type { Insight, InsightContext, InsightRule } from '@/lib/calculations/insights/types'
import { workoutRules } from '@/lib/calculations/insights/workouts'

export * from '@/lib/calculations/insights/types'

export const ALL_RULES: InsightRule[] = [
  ...workoutRules,
  ...sleepRules,
  ...spendingRules,
  ...crossRules,
]

/** Every rule's findings, most important first. */
export function getInsights(context: InsightContext, rules = ALL_RULES): Insight[] {
  return rules
    .flatMap((rule) => rule(context))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
}
