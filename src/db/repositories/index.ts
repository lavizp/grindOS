import type { GrindDB } from '@/db/database'
import { createCategoryRepository } from '@/db/repositories/categories'
import { createExerciseRepository } from '@/db/repositories/exercises'
import { createPaymentRepository } from '@/db/repositories/payments'
import { createSettingsRepository } from '@/db/repositories/settings'
import { createSleepRepository } from '@/db/repositories/sleep'
import { defaultDeps, type RepoDeps } from '@/db/repositories/types'
import { createWorkoutRepository } from '@/db/repositories/workouts'

export function createRepositories(db: GrindDB, deps: RepoDeps = defaultDeps) {
  return {
    workouts: createWorkoutRepository(db, deps),
    sleep: createSleepRepository(db, deps),
    payments: createPaymentRepository(db, deps),
    exercises: createExerciseRepository(db, deps),
    categories: createCategoryRepository(db, deps),
    settings: createSettingsRepository(db),
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export type { CategoryRepository, NewCategoryInput } from '@/db/repositories/categories'
export type { ExerciseRepository } from '@/db/repositories/exercises'
export type { MerchantSuggestion, PaymentRepository } from '@/db/repositories/payments'
export type { SettingsPatch, SettingsRepository } from '@/db/repositories/settings'
export type { SleepRepository } from '@/db/repositories/sleep'
export type { WorkoutRepository } from '@/db/repositories/workouts'
export * from '@/db/repositories/types'
