import { GrindDB } from '@/db/database'
import { createRepositories } from '@/db/repositories'

/** The app's database. Prefer `repositories` over touching tables directly. */
export const db = new GrindDB()
export const repositories = createRepositories(db)
