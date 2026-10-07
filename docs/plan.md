# grindOS: Implementation Plan

Source docs: `docs/index.md` (product), `docs/tech.md` (technical).

Decisions confirmed:
- **Workouts:** strength-focused. A workout has exercises, and each exercise has sets (reps, weight).
- **Insights:** rule-based pure functions. Fully offline, no external services.
- **Currency:** one currency, chosen in Settings. Defaults to **NPR**. Amounts stored as integer minor units (paisa).
- **Hosting:** **Vercel** (static build, HTTPS).

---

## 0. Review of the docs: gaps and adjustments

The tech doc is solid. Overall it's local-first, uses repositories, keeps calculations pure and treats the DB as the source of truth. These are the places where it conflicts with the product doc or leaves something unspecified, and the plan resolves each one:

| # | Issue | Resolution |
|---|---|---|
| 1 | The product doc requires **History** (§5), but tech.md has no route for it. | Add `/history`. |
| 2 | **Insights / Settings** aren't in the 4-tab bottom nav. | Get to them from the Home header (icons). The bottom nav stays Home · Workout · Sleep · Spending, with a central **+** quick-add button. |
| 3 | `Sleep.duration` is stored, which contradicts the "raw vs derived" principle. | Store `bedtime` + `wakeTime` as full local datetimes (to handle crossing midnight) and **derive** duration. |
| 4 | `exercises` is both a table and `Workout.exercises[]`, which is ambiguous. | The `exercises` table is the **exercise catalog** (name, kind). A workout embeds `entries[] = { exerciseId, sets[] }`, with a `multiEntry` index on `exerciseIds` for progress queries. |
| 5 | The product doc wants **editable categories**, but the schema has no table for them. | Add a `categories` table. Payments reference `categoryId`. Deleting a category archives it (or reassigns its payments to "Other"). |
| 6 | Money type isn't specified. | Use integer minor units (`amountMinor: number`), formatted with `Intl.NumberFormat`. |
| 7 | Date storage isn't specified. Timezone bugs are the #1 risk in apps like this. | Index local day keys as `'yyyy-MM-dd'` strings. Store times as local ISO datetimes. Never use `toISOString()` for day keys. |
| 8 | The insight "sleeping less after late workouts" needs to know when a workout happened. | Add an optional `startTime` to Workout. It defaults to "now" when logging today and is never required. |
| 9 | No reactive data access is specified. | Use `dexie-react-hooks` → `useLiveQuery` so the UI updates automatically when the DB changes. |
| 10 | iOS storage risk: Safari can evict IndexedDB, and the device itself can be lost. | Call `navigator.storage.persist()`, use JSON export/import, and show a "last backup N days ago" nudge in Settings and on the Dashboard. |
| 11 | Weight unit isn't specified. | Add a Settings option for kg/lb. Store weight in the chosen unit plus a `unit` field per workout so data stays correct if the setting changes. |
| 12 | Future sync (tech.md "future-proofing") needs metadata. | Every record gets `createdAt` and `updatedAt`. Repositories sit behind interfaces. |
| 13 | Hosting isn't specified. A PWA needs HTTPS to install. | Deploy the static build to **Vercel**. |

---

## Data model (v1)

```ts
// Common
type ID = string;                // crypto.randomUUID()
type DayKey = string;            // 'yyyy-MM-dd' (local)
type LocalDateTime = string;     // 'yyyy-MM-ddTHH:mm' (local, no tz)
interface Meta { createdAt: number; updatedAt: number } // epoch ms

interface Exercise extends Meta {
  id: ID; name: string;
  nameKey: string;               // lower-cased name, unique index
  kind: 'weighted' | 'bodyweight';
  archived?: boolean;
}

interface WorkoutSet { reps: number; weight?: number }  // weight omitted for bodyweight
interface WorkoutEntry { exerciseId: ID; sets: WorkoutSet[]; notes?: string }

interface Workout extends Meta {
  id: ID; date: DayKey;
  name: string;                  // "Push", "Legs", "Running"…
  startTime?: string;            // 'HH:mm'
  durationMin?: number;          // optional, never required
  unit: 'kg' | 'lb';
  entries: WorkoutEntry[];
  exerciseIds: ID[];             // denormalized for multiEntry index
  notes?: string;
}

interface Sleep extends Meta {
  id: ID; date: DayKey;          // the morning you woke up ("last night")
  bedtime: LocalDateTime; wakeTime: LocalDateTime;
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

interface Category extends Meta {
  id: ID; name: string; icon: string; color: string;
  order: number; archived?: boolean;
}

interface Payment extends Meta {
  id: ID; date: DayKey;
  amountMinor: number;           // integer, > 0
  categoryId: ID;
  merchant?: string;             // description/merchant (optional for fast entry)
  notes?: string;
}

interface Settings {             // single row, id = 'app'
  id: 'app';
  currency: string;              // ISO 4217, default 'NPR'
  weightUnit: 'kg' | 'lb';
  weekStartsOn: 0 | 1;           // default 0 (Sunday)
  theme: 'system' | 'light' | 'dark';
  sleepTargetMin: number;        // e.g. 480
  lastBackupAt?: number;
}
```

Dexie indexes (v1):

```
workouts:   id, date, name, *exerciseIds, updatedAt
sleep:      id, &date, updatedAt              // one sleep entry per night
payments:   id, date, categoryId, [categoryId+date], updatedAt
exercises:  id, &nameKey, updatedAt
categories: id, order, updatedAt
settings:   id
```

`archived` is not indexed because IndexedDB can't index booleans. Archived rows are filtered in code.

---

## Steps

Each step ends in a working, committable state. Steps 3–5 are vertical slices (each one covers form, list, calculations and charts for its domain).

### Step 1: Project scaffold and tooling
- Create the app with `pnpm create vite` (react-ts) and TypeScript strict mode, using the `@/` path alias.
- Install and set up Tailwind CSS v4 and shadcn/ui (`components.json`, base tokens).
- Install the dependencies: react-router, dexie, dexie-react-hooks, zustand, react-hook-form, zod, @hookform/resolvers, date-fns, recharts, vite-plugin-pwa, lucide-react.
- Install the dev dependencies: vitest, @testing-library/react, @testing-library/user-event, jsdom, fake-indexeddb, eslint, prettier.
- Add scripts: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`.
- Create the folder structure from tech.md.

**Done when:** `pnpm dev`, `pnpm build`, `pnpm test` and `pnpm lint` all pass on an empty shell.

### Step 2: Core libraries and data layer
- `lib/dates.ts`: `toDayKey`, `parseDayKey`, `startOfWeek`/`Month` ranges (respecting `weekStartsOn`), `sleepDurationMin(bed, wake)` (handles crossing midnight), and range helpers that return `DayKey` bounds.
- `lib/money.ts`: `toMinor`/`fromMinor` using currency decimals from `Intl` (`NumberFormat().resolvedOptions().maximumFractionDigits`), and `formatMoney`.
- `lib/formatters.ts`: durations (`6h 48m`), weights, relative dates.
- `db/schema.ts`: Zod schemas for every entity. These are the single source for TypeScript types (`z.infer`) and are reused by forms and import.
- `db/database.ts`: Dexie class, `version(1).stores(...)`, and an `on('populate')` seed (default categories, a starter exercise catalog, default settings).
- `db/repositories/*`: a typed interface (`WorkoutRepository` and the others) plus a Dexie implementation with `create`, `update`, `remove`, `getById`, `listByRange` and domain-specific queries. Repositories set `id`, `createdAt` and `updatedAt`.
- Hooks: `useWorkouts(range)`, `usePayments(range)` and others, built on `useLiveQuery`.
- `stores/app-store.ts` (Zustand with persisted UI preferences): selected period and filters only.
- Call `navigator.storage.persist()` on startup.

**Tests:** date edge cases (midnight crossing, DST, week start), money rounding, and repository CRUD against `fake-indexeddb`.

### Step 3: App shell and design system
- Pick a visual direction: a calm lifestyle-dashboard look with one accent color per domain (workout, sleep, spending), a type scale and spacing tokens. Support light and dark mode.
- `AppLayout`: a safe-area-aware layout (`viewport-fit=cover`, `env(safe-area-inset-*)`), a bottom tab bar (Home · Workout · Sleep · Spending) and a central **+** button that opens a **Quick Add sheet** (Workout / Sleep / Payment).
- Router: `/`, `/workouts`, `/workouts/new`, `/workouts/:id`, `/sleep`, `/sleep/new`, `/sleep/:id`, `/spending`, `/spending/new`, `/spending/:id`, `/history`, `/insights`, `/settings`. Lazy-load the heavy routes (charts).
- Shared components: `PageHeader`, `StatCard`, `EmptyState`, `PeriodSwitcher` (Week / Month / custom), `ConfirmDelete` (a shadcn alert-dialog, used instead of `confirm()`) and `Sheet`-based forms that feel like native bottom sheets.
- Chart wrappers in `components/charts/` (`BarTrend`, `LineTrend`, `CategoryDonut`, `Heatmap`/`Calendar`) with consistent theming.

**Done when:** you can navigate every route on a phone-sized viewport and the quick-add sheet opens.

### Step 4: Spending (built first because it's the most important and the simplest)
- **Fast entry form:** large numeric amount input (`inputmode="decimal"`, autofocused) → category chips (one tap) → merchant with autocomplete from recent merchants → date (defaults to today) → collapsed notes. Target: about 3 taps plus typing the amount.
- After saving: a toast with an **Undo** action.
- Spending page: totals for this week and this month, a category breakdown (donut and ranked bars), a daily/monthly trend, the largest expenses, and a list grouped by day with tap-to-edit and swipe-or-menu delete.
- `lib/calculations/spending.ts`: `getTotalSpending`, `getSpendingByCategory`, `getDailySpending`, `getMonthlySpending`, `getTopCategories`, `getLargestExpenses`, `getAverageDaily`, `compareMonths`.

**Tests:** every calculation function, plus a form validation test (amount > 0, category required).

### Step 5: Sleep
- **Fast entry:** defaults are prefilled from your last entry (or 23:00 → 07:00). Bedtime and wake time pickers show a live duration preview, quality is 5 tappable icons, notes are optional. The date defaults to today, meaning "last night".
- Enforce one entry per night: if one exists, open it for editing.
- Sleep page: last night, weekly average compared with the target, a duration bar chart, a bedtime/wake consistency chart, and the best and worst nights.
- `lib/calculations/sleep.ts`: `getAverageSleep`, `getSleepConsistency` (std-dev of bedtime and wake time, in minutes), `getSleepTrend`, `getBestWorstNights`, `getSleepDebt` (vs target).

**Tests:** calculations, including entries that cross midnight and empty ranges.

### Step 6: Workouts (the most complex form)
- **Logging flow:**
  - Start a workout: name chips (recent names, plus Push/Pull/Legs/Run). The date defaults to today and the start time defaults to now.
  - **"Repeat last [Push]"** pre-fills the exercises and the last sets used.
  - Add an exercise with a searchable catalog combobox. Typing a new name creates the exercise inline.
  - Each set is one row (reps × weight) with a "+ set" button that copies the previous set. Show "last time: 3×8 @ 60kg" hints.
  - Reorder or remove exercises. Duration and notes are optional.
  - Autosave a draft, so closing the sheet doesn't lose data.
- Workout detail and edit, and delete with confirmation.
- Workouts page: this week's count against a streak, a calendar heatmap, recent workouts, and the most frequent exercises.
- Exercise detail view: progress chart (top set weight and estimated 1RM via Epley), volume over time, and personal records (heaviest weight, best e1RM, most reps at a weight).
- `lib/calculations/workouts.ts`: `getWorkoutFrequency`, `getWeeklyCounts`, `getStreak`, `getTopExercises`, `getExerciseProgress`, `getPersonalRecords`, `getVolume`.

**Tests:** calculations (PR detection, e1RM, streaks across week boundaries) and a component test for the set editor.

### Step 7: Dashboard
- Today card: workout done or not (with a quick log button), last night's sleep with a quality dot, and today's spending compared with the daily average.
- This week: workouts so far against your usual count, average sleep, and spending against last week.
- Month spending snapshot (total, top category, mini trend).
- The top 2–3 insights from Step 9, with a link to all of them.
- Quick-action buttons: Log workout / Log sleep / Add payment.
- Backup nudge if `lastBackupAt` is older than 14 days.
- Prioritize clarity: about 5 cards, each with one key number.

### Step 8: History
- A unified timeline across all three domains, grouped by day.
- Filters: type (workout, sleep, payment), category (for payments), and period (Day, Week, Month, with previous/next navigation). Filter state lives in Zustand.
- Every row is tappable to edit, and you can delete from the edit view.
- Virtualize the list only if performance requires it (it probably won't at personal scale).

### Step 9: Insights engine
- `lib/calculations/insights.ts`: each generator is a pure function `(data, now, settings) => Insight[]`, where `Insight = { id, domain, severity: 'positive'|'neutral'|'warning', priority, title, detail? }`.
- Initial rule set:
  - **Spending:** category up or down X% compared with the same point last month (comparing like-for-like day counts), most expensive category this month, a spending pace projection for month-end, and an unusually large expense (more than 3× the median).
  - **Sleep:** weekly average compared with the target, consistency changes, and the best or worst weekday.
  - **Workouts:** count this week compared with your 4-week average, the current streak, a new PR this week, and an exercise not done in 14+ days.
  - **Cross-domain:** sleep after workout days compared with rest days, and sleep after late workouts (`startTime` ≥ 20:00) compared with others. Only show these when n ≥ 5 per group, to avoid noisy claims.
- A minimum-data threshold on every rule. Insights page grouped by domain. The dashboard shows the top items by priority.

**Tests:** fixture data for each rule, including "not enough data → no insight".

### Step 10: Settings, categories and backup
- Settings: currency, weight unit, week start, theme, sleep target.
- Category manager: rename, change icon and color, reorder, archive, add new.
- Exercise catalog manager: rename, merge duplicates, archive.
- **Export:** JSON `{ app: 'grindOS', schemaVersion, exportedAt, data: {...tables} }`. Use `navigator.share` with a File on iOS (so it can be saved to Files or AirDrop), and fall back to a download link on desktop. Exporting updates `lastBackupAt`.
- **Import:** pick a file → Zod validation → a preview (counts per table) → **Replace all** or **Merge** (upsert by `id`, keeping the newer `updatedAt`). It runs in a single Dexie transaction and is rolled back if it fails.
- A "Delete all data" option with typed confirmation.

**Tests:** export → import round-trip produces identical data, invalid files are rejected, and merge conflict resolution works.

### Step 11: PWA and iOS polish
- `vite-plugin-pwa` (`generateSW`, `registerType: 'prompt'`): precache the app shell and assets, with `navigateFallback` set to `index.html`. The "Update available → Reload" toast prevents stale versions.
- Manifest: name, short_name, `display: standalone`, theme and background colors, and icons (192, 512, maskable).
- iOS specifics:
  - `apple-touch-icon`, `apple-mobile-web-app-capable`, status bar style and (optionally) splash images.
  - On iOS, show an "Add to Home Screen" how-to card when the app isn't running standalone (iOS has no install prompt).
  - Prevent the input-zoom issue (16px minimum font size on inputs) and disable overscroll bounce where it looks wrong.
  - Haptic-like press states and 44pt minimum touch targets.
- Offline verification: Lighthouse PWA audit, airplane-mode testing of every feature, and a cold start offline.
- Deploy to **Vercel**: connect the Git repo (Vite preset, `pnpm build`, output `dist`). Add a `vercel.json` SPA rewrite to `/index.html`, and set `Cache-Control: no-cache` for `sw.js` and `index.html` so updates reach the phone. Then install it on the iPhone.

### Step 12: QA and finishing
- Seed script with about 90 days of realistic fake data (dev only) to check that charts and insights look right.
- Accessibility pass: labels, focus order, color contrast, and reduced-motion support.
- Performance: route-level code splitting, Recharts loaded lazily, and a bundle size check.
- Empty states and first-run onboarding (confirm the currency, NPR by default, then you're done).
- README with setup, how to deploy and the backup instructions.

---

## Suggested commit and PR order

1. Scaffold (Step 1)
2. Data layer and libs, with tests (Step 2)
3. Shell and design system (Step 3)
4. Spending (Step 4)
5. Sleep (Step 5)
6. Workouts (Step 6)
7. Dashboard and History (Steps 7–8)
8. Insights (Step 9)
9. Settings and backup (Step 10)
10. PWA, deploy and QA (Steps 11–12)

You can use the app after milestone 4 (spending only). Every milestone after that adds a domain or a feature.

## Risks to watch
- **Timezones and DST:** handle these only through `lib/dates.ts`, and test heavily.
- **iOS storage eviction or a lost phone:** use persistent storage, run regular exports and show backup nudges.
- **Workout form complexity on mobile:** prototype the set editor early in Step 6 and keep the number of taps minimal.
- **Misleading insights:** enforce minimum sample sizes and use cautious wording.
