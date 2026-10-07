# grindOS

A private, local-first PWA for tracking workouts, sleep, and spending on iPhone.
All data stays on-device in IndexedDB — no account, no backend.

See [`docs/`](docs/) for the product brief, technical design, and implementation plan.

## Stack

React · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · Dexie · Zustand ·
React Hook Form + Zod · Recharts · date-fns · vite-plugin-pwa · Vitest

## Development

```sh
pnpm install
pnpm dev          # start dev server
pnpm test         # run tests once (pnpm test:watch for watch mode)
pnpm lint         # oxlint
pnpm typecheck    # tsc -b
pnpm format       # prettier --write
pnpm build        # typecheck + production build
```

## Project structure

```text
src/
├── app/            # App root, router, providers
├── features/       # dashboard, workouts, sleep, spending, history, insights, settings
├── components/
│   ├── ui/         # shadcn/ui
│   ├── charts/
│   └── common/
├── db/             # Dexie database, schema, repositories
├── hooks/
├── lib/            # dates, money, formatters, calculations/
├── stores/         # Zustand (UI state only)
├── types/
└── test/           # test setup
```
