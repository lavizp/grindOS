import Dexie, { type Table } from 'dexie'
import { DEFAULT_SETTINGS } from '@/db/schema'
import type {
  Category,
  Exercise,
  Payment,
  Settings,
  Sleep,
  Workout,
  WorkoutTemplate,
} from '@/db/schema'
import { buildSeedCategories, buildSeedExercises } from '@/db/seed'

export const DEFAULT_DB_NAME = 'grindos'

export class GrindDB extends Dexie {
  workouts!: Table<Workout, string>
  sleep!: Table<Sleep, string>
  payments!: Table<Payment, string>
  exercises!: Table<Exercise, string>
  categories!: Table<Category, string>
  settings!: Table<Settings, string>
  templates!: Table<WorkoutTemplate, string>

  constructor(name = DEFAULT_DB_NAME) {
    super(name)

    // Booleans aren't valid IndexedDB keys, so `archived` is filtered in code.
    this.version(1).stores({
      workouts: 'id, date, name, *exerciseIds, updatedAt',
      sleep: 'id, &date, updatedAt',
      payments: 'id, date, categoryId, [categoryId+date], updatedAt',
      exercises: 'id, &nameKey, updatedAt',
      categories: 'id, order, updatedAt',
      settings: 'id',
    })
    // Templates start empty: they're the user's own routines.
    this.version(2).stores({
      templates: 'id, &nameKey, updatedAt',
    })

    this.on('populate', async (tx) => {
      const now = Date.now()
      await tx.table('categories').bulkAdd(buildSeedCategories(now))
      await tx.table('exercises').bulkAdd(buildSeedExercises(now))
      await tx.table('settings').add(DEFAULT_SETTINGS)
    })
  }
}
