import { GrindDB } from '@/db/database'
import { createRepositories } from '@/db/repositories'

/** A fresh, isolated database with a deterministic clock and ids. */
export function createTestDb() {
  const db = new GrindDB(`test-${crypto.randomUUID()}`)
  let time = Date.UTC(2026, 0, 1)
  let seq = 0
  const clock = {
    now: () => time,
    advance: (ms = 1000) => {
      time += ms
    },
  }
  const repos = createRepositories(db, { now: () => clock.now(), newId: () => `id-${++seq}` })
  return { db, repos, clock }
}
