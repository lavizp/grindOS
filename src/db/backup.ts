import type { Table } from 'dexie'
import { z } from 'zod'
import type { GrindDB } from '@/db/database'
import {
  bodyWeightSchema,
  categorySchema,
  DEFAULT_SETTINGS,
  exerciseSchema,
  paymentSchema,
  settingsSchema,
  sleepSchema,
  templateSchema,
  workoutSchema,
  type ID,
  type Meta,
  type Workout,
  type WorkoutTemplate,
} from '@/db/schema'
import { buildSeedCategories, buildSeedExercises } from '@/db/seed'
import { toDayKey } from '@/lib/dates'

// A backup is the whole database as JSON. Import validates every record with
// the same schemas the app writes with, and runs in one transaction, so a bad
// file changes nothing.

export const BACKUP_APP = 'grindOS'
// Version 2 added workout templates and version 3 body weight; older files import with none.
export const BACKUP_SCHEMA_VERSION = 3

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().min(1).max(BACKUP_SCHEMA_VERSION),
  exportedAt: z.number().int().nonnegative(),
  data: z.object({
    workouts: z.array(workoutSchema),
    sleep: z.array(sleepSchema),
    payments: z.array(paymentSchema),
    exercises: z.array(exerciseSchema),
    categories: z.array(categorySchema),
    settings: z.array(settingsSchema).max(1),
    templates: z.array(templateSchema).default([]),
    bodyWeights: z.array(bodyWeightSchema).default([]),
  }),
})

export type Backup = z.infer<typeof backupSchema>
export type BackupData = Backup['data']
export type TableName = keyof BackupData

/** Tables with records people log, as opposed to catalogs and settings. */
export const ENTRY_TABLES = ['workouts', 'sleep', 'payments'] as const

export async function exportBackup(db: GrindDB, now = Date.now()): Promise<Backup> {
  return db.transaction(
    'r',
    [
      db.workouts,
      db.sleep,
      db.payments,
      db.exercises,
      db.categories,
      db.settings,
      db.templates,
      db.bodyWeights,
    ],
    async () => ({
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: now,
      data: {
        workouts: await db.workouts.toArray(),
        sleep: await db.sleep.toArray(),
        payments: await db.payments.toArray(),
        exercises: await db.exercises.toArray(),
        categories: await db.categories.toArray(),
        settings: await db.settings.toArray(),
        templates: await db.templates.toArray(),
        bodyWeights: await db.bodyWeights.toArray(),
      },
    }),
  )
}

export function backupFileName(exportedAt: number): string {
  return `grindos-backup-${toDayKey(new Date(exportedAt))}.json`
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/** Validates a backup file's text. Errors are written for people, not developers. */
export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t a grindOS backup. It isn’t valid JSON.' }
  }
  const header = z.object({ app: z.string(), schemaVersion: z.number() }).safeParse(json)
  if (!header.success || header.data.app !== BACKUP_APP) {
    return { ok: false, error: 'This file isn’t a grindOS backup.' }
  }
  if (header.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup comes from a newer version of grindOS. Update the app and try again.',
    }
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue.path.slice(0, 3).join(' → ')
    return {
      ok: false,
      error: `This backup is damaged and can’t be imported (${where}: ${issue.message}).`,
    }
  }
  return { ok: true, backup: result.data }
}

export type BackupSummary = Record<TableName, number>

export function summarizeBackup(backup: Backup): BackupSummary {
  const { data } = backup
  return {
    workouts: data.workouts.length,
    sleep: data.sleep.length,
    payments: data.payments.length,
    exercises: data.exercises.length,
    categories: data.categories.length,
    settings: data.settings.length,
    templates: data.templates.length,
    bodyWeights: data.bodyWeights.length,
  }
}

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  /** New or updated records. */
  written: number
  /** Records already present in a version at least as new. */
  skipped: number
}

/**
 * Replace wipes the database and loads the backup. Merge keeps what's here
 * and adds the backup's records, keeping whichever copy of a record (by id)
 * was updated last. Either way it's one transaction: it all happens or none of it.
 */
export async function importBackup(
  db: GrindDB,
  backup: Backup,
  mode: ImportMode,
): Promise<ImportResult> {
  const tables = [
    db.workouts,
    db.sleep,
    db.payments,
    db.exercises,
    db.categories,
    db.settings,
    db.templates,
    db.bodyWeights,
  ]
  return db.transaction('rw', tables, async () => {
    const { data } = backup
    if (mode === 'replace') {
      await Promise.all(tables.map((t) => t.clear()))
      await db.exercises.bulkAdd(data.exercises)
      await db.categories.bulkAdd(data.categories)
      await db.workouts.bulkAdd(data.workouts)
      await db.sleep.bulkAdd(data.sleep)
      await db.payments.bulkAdd(data.payments)
      await db.templates.bulkAdd(data.templates)
      await db.bodyWeights.bulkAdd(data.bodyWeights)
      await db.settings.put(data.settings[0] ?? DEFAULT_SETTINGS)
      const written = Object.values(summarizeBackup(backup)).reduce((a, b) => a + b, 0)
      return { written, skipped: 0 }
    }
    return mergeBackup(db, data)
  })
}

async function mergeBackup(db: GrindDB, data: BackupData): Promise<ImportResult> {
  const result: ImportResult = { written: 0, skipped: 0 }

  // Exercises are unique by name. An incoming exercise whose name already
  // exists here under another id is folded into the local one, and its
  // workouts are pointed at the local id.
  const remap = new Map<ID, ID>()
  for (const incoming of data.exercises) {
    const sameName = await db.exercises.where('nameKey').equals(incoming.nameKey).first()
    if (sameName && sameName.id !== incoming.id) {
      remap.set(incoming.id, sameName.id)
      result.skipped += 1
    } else {
      await upsert(db.exercises, incoming, result)
    }
  }

  await Promise.all(data.categories.map((c) => upsert(db.categories, c, result)))
  await Promise.all(data.payments.map((p) => upsert(db.payments, p, result)))
  for (const workout of data.workouts) {
    await upsert(db.workouts, remapWorkout(workout, remap), result)
  }

  // Templates are unique by name: when both sides have one with the same name
  // under different ids, the one updated last wins.
  for (const template of data.templates) {
    const incoming = remapTemplate(template, remap)
    const sameName = await db.templates.where('nameKey').equals(incoming.nameKey).first()
    if (sameName && sameName.id !== incoming.id) {
      if (incoming.updatedAt > sameName.updatedAt) {
        await db.templates.delete(sameName.id)
        await db.templates.add(incoming)
        result.written += 1
      } else {
        result.skipped += 1
      }
    } else {
      await upsert(db.templates, incoming, result)
    }
  }

  // One entry per night, and one weigh-in per day: when both sides logged the
  // same day under different ids, the one updated last wins.
  for (const incoming of data.sleep) await upsertByDate(db.sleep, incoming, result)
  for (const incoming of data.bodyWeights) await upsertByDate(db.bodyWeights, incoming, result)

  // Settings are this device's: a merge only brings over a newer backup date.
  const incomingSettings = data.settings[0]
  const local = (await db.settings.get(DEFAULT_SETTINGS.id)) ?? DEFAULT_SETTINGS
  if ((incomingSettings?.lastBackupAt ?? 0) > (local.lastBackupAt ?? 0)) {
    await db.settings.put({ ...local, lastBackupAt: incomingSettings!.lastBackupAt })
  }
  return result
}

async function upsert<T extends Meta>(
  table: { get(id: ID): Promise<T | undefined>; put(row: T): Promise<unknown> },
  incoming: T,
  result: ImportResult,
) {
  const existing = await table.get(incoming.id)
  if (existing && existing.updatedAt >= incoming.updatedAt) {
    result.skipped += 1
    return
  }
  await table.put(incoming)
  result.written += 1
}

async function upsertByDate<T extends Meta & { date: string }>(
  table: Table<T, ID>,
  incoming: T,
  result: ImportResult,
) {
  const sameDay = await table.where('date').equals(incoming.date).first()
  if (sameDay && sameDay.id !== incoming.id) {
    if (incoming.updatedAt > sameDay.updatedAt) {
      await table.delete(sameDay.id)
      await table.add(incoming)
      result.written += 1
    } else {
      result.skipped += 1
    }
  } else {
    await upsert(table, incoming, result)
  }
}

function remapWorkout(workout: Workout, remap: Map<ID, ID>): Workout {
  if (remap.size === 0 || !workout.exerciseIds.some((id) => remap.has(id))) return workout
  const map = (id: ID) => remap.get(id) ?? id
  return {
    ...workout,
    entries: workout.entries.map((e) => ({ ...e, exerciseId: map(e.exerciseId) })),
    exerciseIds: [...new Set(workout.exerciseIds.map(map))],
  }
}

function remapTemplate(template: WorkoutTemplate, remap: Map<ID, ID>): WorkoutTemplate {
  if (!template.entries.some((e) => remap.has(e.exerciseId))) return template
  return {
    ...template,
    entries: template.entries.map((e) => ({
      ...e,
      exerciseId: remap.get(e.exerciseId) ?? e.exerciseId,
    })),
  }
}

/** Empties the app back to a fresh install: default categories, exercises and settings. */
export async function deleteAllData(db: GrindDB, now = Date.now()): Promise<void> {
  const tables = [
    db.workouts,
    db.sleep,
    db.payments,
    db.exercises,
    db.categories,
    db.settings,
    db.templates,
    db.bodyWeights,
  ]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.categories.bulkAdd(buildSeedCategories(now))
    await db.exercises.bulkAdd(buildSeedExercises(now))
    await db.settings.add(DEFAULT_SETTINGS)
  })
}
