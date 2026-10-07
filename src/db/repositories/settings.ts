import type { GrindDB } from '@/db/database'
import { DEFAULT_SETTINGS, SETTINGS_ID, settingsSchema, type Settings } from '@/db/schema'

export type SettingsPatch = Partial<Omit<Settings, 'id'>>

export interface SettingsRepository {
  /** Stored settings, or the defaults if none exist yet. */
  get(): Promise<Settings>
  update(patch: SettingsPatch): Promise<Settings>
}

export function createSettingsRepository(db: GrindDB): SettingsRepository {
  async function get() {
    return (await db.settings.get(SETTINGS_ID)) ?? DEFAULT_SETTINGS
  }

  return {
    get,

    async update(patch) {
      return db.transaction('rw', db.settings, async () => {
        const next = settingsSchema.parse({ ...(await get()), ...patch, id: SETTINGS_ID })
        await db.settings.put(next)
        return next
      })
    },
  }
}
