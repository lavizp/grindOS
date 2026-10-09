import type { Repositories } from '@/db/repositories'
import type { WorkoutEntry } from '@/db/schema'
import { addDaysToKey, parseDayKey, resolveSleepTimes, todayKey, type DayKey } from '@/lib/dates'

// Development only: about three months of believable data, to check that
// charts, insights and lists look right. Deterministic for a given seed.

export interface DemoOptions {
  today?: DayKey
  days?: number
  seed?: number
}

export interface DemoSummary {
  workouts: number
  nights: number
  payments: number
  weighIns: number
}

/** Small, fast, seedable PRNG (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  }
}

const hhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Exercise, starting weight (kg; 0 for bodyweight), reps, weekly increase. */
const PLANS: Record<string, Array<[id: string, start: number, reps: number, step: number]>> = {
  Push: [
    ['ex_bench_press', 55, 8, 1.25],
    ['ex_overhead_press', 30, 8, 0.6],
    ['ex_incline_dumbbell_press', 18, 10, 0.5],
    ['ex_dips', 0, 10, 0],
    ['ex_lateral_raise', 7, 15, 0.2],
  ],
  Pull: [
    ['ex_barbell_row', 45, 8, 1],
    ['ex_pull_up', 0, 6, 0],
    ['ex_lat_pulldown', 40, 10, 1],
    ['ex_bicep_curl', 10, 12, 0.25],
  ],
  Legs: [
    ['ex_squat', 70, 5, 2],
    ['ex_romanian_deadlift', 60, 8, 1.5],
    ['ex_leg_press', 110, 10, 2.5],
    ['ex_calf_raise', 40, 15, 1],
  ],
}

const SPENDING: Array<
  [categoryId: string, weight: number, min: number, max: number, merchants: string[]]
> = [
  [
    'cat_food',
    9,
    150,
    1200,
    ['Bhatbhateni', 'Momo House', 'Himalayan Java', 'Foodmandu', 'Local market'],
  ],
  ['cat_transport', 5, 100, 600, ['Pathao', 'inDrive', 'Sajha Yatayat']],
  ['cat_shopping', 2, 800, 5000, ['Daraz', 'Bhatbhateni']],
  ['cat_entertainment', 1, 400, 1500, ['QFX Cinemas', 'Steam']],
  ['cat_health', 1, 200, 2500, ['Pharmacy', 'Clinic']],
]
const MONTHLY_BILLS: Array<[day: number, categoryId: string, amount: number, merchant: string]> = [
  [3, 'cat_bills', 2400, 'NEA'],
  [5, 'cat_bills', 1500, 'Worldlink'],
  [10, 'cat_subscriptions', 1199, 'Netflix'],
  [12, 'cat_subscriptions', 299, 'Spotify'],
  [15, 'cat_bills', 18000, 'Rent'],
]

export async function seedDemoData(
  repos: Repositories,
  { today = todayKey(), days = 90, seed = 7 }: DemoOptions = {},
): Promise<DemoSummary> {
  const rng = random(seed)
  // Its own generator, so adding weigh-ins left the other demo data unchanged.
  const scale = random(seed + 1)
  const summary: DemoSummary = { workouts: 0, nights: 0, payments: 0, weighIns: 0 }
  const order = ['Push', 'Pull', 'Legs']
  let session = 0

  for (let back = days - 1; back >= 0; back--) {
    const date = addDaysToKey(today, -back)
    const weekday = parseDayKey(date).getDay()
    const week = Math.floor((days - 1 - back) / 7)

    // Sleep: most nights, later on weekends, now and then skipped.
    if (rng.chance(0.9) && (back > 0 || rng.chance(0.5))) {
      const weekend = weekday === 0 || weekday === 6
      const bed = 22 * 60 + 30 + rng.int(0, 120) + (weekend ? 45 : 0)
      const wake = 6 * 60 + 15 + rng.int(0, 90) + (weekend ? 60 : 0)
      await repos.sleep.create({
        date,
        ...resolveSleepTimes(date, hhmm(bed), hhmm(wake)),
        quality: rng.chance(0.85) ? (rng.int(2, 5) as 2 | 3 | 4 | 5) : undefined,
      })
      summary.nights += 1
    }

    // Body weight: most mornings, drifting down about 3 kg with daily noise.
    if (scale.chance(0.8)) {
      const trend = 82 - (3 * (days - 1 - back)) / days
      const weight = Math.round((trend + (scale.next() - 0.5) * 1.2) * 10) / 10
      await repos.bodyWeights.create({ date, weight, unit: 'kg' })
      summary.weighIns += 1
    }

    // Workouts: Mon/Wed/Fri plus the odd Saturday, rotating Push, Pull, Legs.
    if ([1, 3, 5].includes(weekday) || (weekday === 6 && rng.chance(0.3))) {
      if (rng.chance(0.9)) {
        const name = order[session % order.length]
        session += 1
        const entries: WorkoutEntry[] = PLANS[name].map(([exerciseId, start, reps, step]) => ({
          exerciseId,
          sets: [0, 1, 2].map((set) => {
            const r = Math.max(1, reps - (set === 2 ? rng.int(0, 2) : 0))
            return start
              ? { reps: r, weight: Math.round((start + step * week) * 4) / 4 }
              : { reps: r + rng.int(0, 2) }
          }),
        }))
        await repos.workouts.create({
          date,
          name,
          unit: 'kg',
          startTime: rng.chance(0.2) ? '20:30' : rng.pick(['07:00', '18:30']),
          durationMin: rng.int(45, 75),
          entries,
        })
        summary.workouts += 1
      }
    }

    // Everyday spending, plus the monthly bills.
    const count = rng.int(0, 3)
    for (let i = 0; i < count; i++) {
      const total = SPENDING.reduce((sum, [, w]) => sum + w, 0)
      let roll = rng.next() * total
      const [categoryId, , min, max, merchants] =
        SPENDING.find(([, w]) => (roll -= w) < 0) ?? SPENDING[0]
      await repos.payments.create({
        date,
        categoryId,
        amountMinor: Math.round(rng.int(min, max) / 10) * 1000,
        merchant: rng.chance(0.85) ? rng.pick(merchants) : undefined,
      })
      summary.payments += 1
    }
    for (const [day, categoryId, amount, merchant] of MONTHLY_BILLS) {
      if (parseDayKey(date).getDate() === day) {
        await repos.payments.create({ date, categoryId, amountMinor: amount * 100, merchant })
        summary.payments += 1
      }
    }
  }
  return summary
}
