For this app, I'd keep the stack **simple and local-first**. You don't need a backend initially.

### Stack

| Area | Choice |
|---|---|
| Framework | **React + Vite + TypeScript** |
| Styling | **Tailwind CSS** |
| UI | **shadcn/ui** |
| Local DB | **IndexedDB via Dexie** |
| PWA | **vite-plugin-pwa** |
| Charts | **Recharts** |
| Forms | **React Hook Form + Zod** |
| State | **Zustand** |
| Date handling | **date-fns** |
| IDs | **crypto.randomUUID()** |
| Package manager | **pnpm** |
| Testing | **Vitest + React Testing Library** |

No backend, API, authentication, or cloud database for the MVP.

---

## Architecture

Use a **feature-oriented architecture**, rather than organizing everything by technical type.

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── features/
│   ├── dashboard/
│   ├── workouts/
│   ├── sleep/
│   ├── spending/
│   └── insights/
│
├── components/
│   ├── ui/                 # shadcn
│   ├── charts/
│   └── common/
│
├── db/
│   ├── database.ts
│   ├── schema.ts
│   └── repositories/
│       ├── workouts.ts
│       ├── sleep.ts
│       └── spending.ts
│
├── lib/
│   ├── calculations/
│   ├── dates.ts
│   ├── formatters.ts
│   └── utils.ts
│
├── stores/
│   └── app-store.ts
│
├── types/
│   └── index.ts
│
└── main.tsx
```

### Data flow

Keep the architecture roughly:

```text
              React UI
                 │
                 ▼
          Feature components
                 │
                 ▼
        Hooks / application logic
                 │
          ┌──────┴──────┐
          ▼             ▼
       Zustand       Calculations
          │             │
          └──────┬──────┘
                 ▼
              Dexie
                 │
                 ▼
             IndexedDB
```

The **database should be the source of truth**.

Don't put all workout/payment/sleep records into Zustand. Zustand should primarily hold temporary UI/application state.

---

## Database

I'd use Dexie with separate tables.

```text
IndexedDB
│
├── workouts
├── sleep
├── payments
├── exercises
└── settings
```

For example:

```ts
Workout
├── id
├── date
├── type
├── duration
├── notes
└── exercises[]

Sleep
├── id
├── date
├── bedtime
├── wakeTime
├── duration
├── quality
└── notes

Payment
├── id
├── date
├── amount
├── category
├── merchant
└── notes
```

Keep the schema versioned so you can migrate it later.

---

## Important architectural principle

Separate **raw data** from **derived data**.

For example, don't store:

```ts
{
  totalMonthlySpending: 45000
}
```

Instead store the actual payments:

```text
Payment 1 → 500
Payment 2 → 1200
Payment 3 → 300
...
```

Then calculate:

```text
payments
   ↓
aggregation functions
   ↓
monthly spending
category breakdown
averages
trends
insights
```

This prevents your database from getting inconsistent.

---

## Calculations layer

Have pure functions for analytics:

```text
lib/calculations/

spending.ts
├── getTotalSpending()
├── getSpendingByCategory()
├── getMonthlySpending()
└── getTopCategories()

workouts.ts
├── getWorkoutFrequency()
├── getExerciseProgress()
└── getPersonalRecords()

sleep.ts
├── getAverageSleep()
├── getSleepConsistency()
└── getSleepTrend()

insights.ts
├── generateSpendingInsights()
├── generateSleepInsights()
└── generateWorkoutInsights()
```

These functions should ideally be **pure and easily testable**.

---

## PWA architecture

```text
                 iPhone
                   │
            ┌──────▼──────┐
            │   PWA UI    │
            └──────┬──────┘
                   │
             Service Worker
                   │
        ┌──────────┴──────────┐
        │                     │
   Cached assets          IndexedDB
        │                     │
   JS/CSS/images         User's data
```

The service worker handles the application itself being available offline.

IndexedDB handles the **actual user data**.

These are two separate concerns.

---

## Navigation

I'd use React Router:

```text
/
├── /workouts
├── /workouts/new
├── /workouts/:id
├── /sleep
├── /sleep/new
├── /spending
├── /spending/new
├── /insights
└── /settings
```

Mobile navigation:

```text
┌─────────────────────────────┐
│                             │
│        Current Page         │
│                             │
│                             │
├─────────────────────────────┤
│ Home Workout Sleep Spending │
└─────────────────────────────┘
```

---

## Forms

Use:

**React Hook Form → Zod → Dexie**

```text
User input
    ↓
React Hook Form
    ↓
Zod validation
    ↓
Repository
    ↓
Dexie
    ↓
IndexedDB
```

This keeps validation separate from your UI.

---

## State management

Don't overuse Zustand.

For example:

**Zustand:**

```ts
{
  theme,
  selectedDate,
  filters,
  UI preferences
}
```

**Dexie:**

```text
workouts
sleep records
payments
settings
```

**React state:**

```text
form state
modal state
temporary UI state
```

This keeps things predictable.

---

## Future-proofing

Don't build a backend now.

But structure the repositories so that this:

```ts
workoutRepository.create(workout)
```

doesn't care whether the implementation eventually uses:

```text
IndexedDB
    ↓
Supabase / PostgreSQL
```

If you eventually want:

- Multiple devices
- Cloud backup
- Account authentication
- Automatic syncing

you can introduce a sync layer later without rewriting the entire UI.

### Final architecture

```text
             React + TypeScript
                     │
              React Router
                     │
          ┌──────────┼──────────┐
          │          │          │
       Workout     Sleep     Spending
          │          │          │
          └──────────┼──────────┘
                     │
              Application Logic
                     │
        ┌────────────┴────────────┐
        │                         │
     Zustand                 Calculations
        │                         │
        └────────────┬────────────┘
                     │
                  Dexie
                     │
                 IndexedDB
                     │
             ┌───────┴───────┐
             │               │
        Service Worker    PWA Cache
             │               │
             └───────┬───────┘
                     ▼
                  iPhone
```

**Core philosophy:** local-first, offline-first, no backend, minimal global state, database as source of truth, and pure calculation functions for all analytics.
