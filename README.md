# grindOS

A private, local-first app for tracking workouts, sleep and spending on iPhone.
Everything stays on the device in IndexedDB: no account, no server. It installs
to the Home Screen and works offline.

See [`docs/`](docs/) for the product brief, technical design and implementation plan.

## What it does

- **Workouts:** log sets and reps fast, repeat your last session, and follow
  personal records and progress for each exercise. Save routines such as "Push"
  as templates (**Settings → Workout templates**, or **Save as template** on a
  logged workout) and start a workout from one in one tap.
- **Sleep:** bedtime and wake time with a duration preview, quality, averages
  against your target, and how regular your bedtime is.
- **Spending:** amount and category in about three taps, then breakdowns,
  trends and month-on-month comparisons.
- **Home, History and Insights:** today at a glance, one timeline of
  everything, and rule-based insights (such as "Food spending is up 30% on last
  month") computed on the device.

## Install on iPhone

1. Open the deployed site in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.

The installed app opens full screen and works offline. Installing also matters
for your data: Safari can clear storage for sites that aren't installed.

## Backups

Your data exists only on your phone. Back it up now and then:

- **Settings → Backup → Export backup** saves one JSON file. On iPhone the share
  sheet opens, so you can save it to Files or iCloud Drive, or AirDrop it.
- **Import backup** reads that file on this or another device. It shows what's
  in it first, then:
  - **Merge** keeps what's on the device and adds the backup. Where both have
    the same entry, the most recent edit wins.
  - **Replace all** deletes everything on the device first, settings included.
- Home shows a reminder when the last backup is more than 14 days old.

An import either completes fully or changes nothing.

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev          # dev server at http://localhost:5173
pnpm test         # run tests once (pnpm test:watch for watch mode)
pnpm lint         # oxlint
pnpm typecheck    # tsc -b
pnpm format       # prettier --write
pnpm build        # typecheck + production build (with service worker)
pnpm preview      # serve the production build locally
pnpm size         # after a build: check startup JS against its budget
```

**Demo data:** in development, **Settings → Development → Load demo data** adds
about 90 days of workouts, sleep and payments, to check that charts and insights
look right. It's left out of production builds. **Delete all data** clears it.

**Offline and updates:** the service worker only runs in production builds, so
check offline behavior with `pnpm build && pnpm preview`. A new deploy shows
"A new version of grindOS is ready" with a Reload button; it never reloads by
itself.

## Deploy

The app is a static site, set up for [Vercel](https://vercel.com):

1. Import the GitHub repository as a new Vercel project.
2. Keep the settings from [`vercel.json`](vercel.json): `pnpm build`, output
   `dist`, every route served by `index.html`.
3. Deploy. Every push to `main` deploys again.

`vercel.json` stops browsers from caching `sw.js`, `index.html` and the
manifest, so updates reach installed apps, and caches the hashed files in
`/assets` for a year. Any static host works if it does the same and serves
over HTTPS, which installing requires.

## Project structure

```text
src/
├── app/            # App root, router, providers, update prompt
├── features/       # dashboard, workouts, sleep, spending, history, insights, settings
├── components/
│   ├── ui/         # shadcn/ui primitives
│   ├── charts/     # Recharts wrappers (loaded with the pages that use them)
│   ├── common/     # shared page pieces: headers, sheets, cards, controls
│   └── layout/     # app shell, bottom navigation, quick add
├── db/             # Dexie database, Zod schemas, repositories, backup
├── hooks/          # live queries and UI hooks
├── lib/            # dates, money, formatters, platform
│   └── calculations/  # pure functions behind every number and insight
├── stores/         # Zustand (UI state only)
├── dev/            # demo data (development only)
└── test/           # test setup and fixtures
```

Dates are local calendar days (`yyyy-MM-dd`) handled only through
`lib/dates.ts`, and money is stored as integer minor units. Tests run in a
timezone with daylight saving time, so clock changes are covered.
