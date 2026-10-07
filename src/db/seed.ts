import type { Category, Exercise, ExerciseKind } from '@/db/schema'

// Seeded rows use stable ids so data merged from another device
// (via import) lines up instead of duplicating defaults.

const DEFAULT_CATEGORIES: Array<Pick<Category, 'id' | 'name' | 'icon' | 'color'>> = [
  { id: 'cat_food', name: 'Food', icon: 'utensils', color: '#f97316' },
  { id: 'cat_transport', name: 'Transport', icon: 'car', color: '#3b82f6' },
  { id: 'cat_shopping', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#a855f7' },
  { id: 'cat_bills', name: 'Bills', icon: 'receipt', color: '#eab308' },
  { id: 'cat_subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#06b6d4' },
  { id: 'cat_health', name: 'Health', icon: 'heart-pulse', color: '#ef4444' },
  { id: 'cat_education', name: 'Education', icon: 'graduation-cap', color: '#22c55e' },
  { id: 'cat_other', name: 'Other', icon: 'circle-ellipsis', color: '#64748b' },
]

export const OTHER_CATEGORY_ID = 'cat_other'

const DEFAULT_EXERCISES: Array<[name: string, kind: ExerciseKind]> = [
  ['Bench Press', 'weighted'],
  ['Incline Dumbbell Press', 'weighted'],
  ['Overhead Press', 'weighted'],
  ['Lateral Raise', 'weighted'],
  ['Triceps Pushdown', 'weighted'],
  ['Dips', 'bodyweight'],
  ['Push-up', 'bodyweight'],
  ['Pull-up', 'bodyweight'],
  ['Barbell Row', 'weighted'],
  ['Lat Pulldown', 'weighted'],
  ['Seated Cable Row', 'weighted'],
  ['Face Pull', 'weighted'],
  ['Bicep Curl', 'weighted'],
  ['Squat', 'weighted'],
  ['Deadlift', 'weighted'],
  ['Romanian Deadlift', 'weighted'],
  ['Leg Press', 'weighted'],
  ['Lunge', 'weighted'],
  ['Leg Curl', 'weighted'],
  ['Leg Extension', 'weighted'],
  ['Hip Thrust', 'weighted'],
  ['Calf Raise', 'weighted'],
]

export function exerciseNameKey(name: string): string {
  return name.trim().toLowerCase()
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function buildSeedCategories(now: number): Category[] {
  return DEFAULT_CATEGORIES.map((category, order) => ({
    ...category,
    order,
    createdAt: now,
    updatedAt: now,
  }))
}

export function buildSeedExercises(now: number): Exercise[] {
  return DEFAULT_EXERCISES.map(([name, kind]) => ({
    id: `ex_${slug(name)}`,
    name,
    nameKey: exerciseNameKey(name),
    kind,
    createdAt: now,
    updatedAt: now,
  }))
}
