import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { NotFoundPage } from '@/features/not-found-page'

// Home is eager so the app opens instantly. Every other page is split out,
// which keeps Recharts out of the initial bundle.

const entry = (domain: 'workout' | 'sleep') => () =>
  import('@/components/common/entry-sheet-placeholder').then(({ EntrySheetPlaceholder }) => ({
    Component: () => <EntrySheetPlaceholder domain={domain} />,
  }))

const paymentSheet = () =>
  import('@/features/spending/payment-sheet').then((m) => ({ Component: m.PaymentSheet }))

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    HydrateFallback: PageSkeleton,
    children: [
      { index: true, Component: DashboardPage },
      {
        path: 'workouts',
        lazy: () =>
          import('@/features/workouts/workouts-page').then((m) => ({ Component: m.WorkoutsPage })),
        children: [
          { path: 'new', lazy: entry('workout') },
          { path: ':id', lazy: entry('workout') },
        ],
      },
      {
        path: 'sleep',
        lazy: () => import('@/features/sleep/sleep-page').then((m) => ({ Component: m.SleepPage })),
        children: [
          { path: 'new', lazy: entry('sleep') },
          { path: ':id', lazy: entry('sleep') },
        ],
      },
      {
        path: 'spending',
        lazy: () =>
          import('@/features/spending/spending-page').then((m) => ({ Component: m.SpendingPage })),
        children: [
          { path: 'new', lazy: paymentSheet },
          { path: ':id', lazy: paymentSheet },
        ],
      },
      {
        path: 'history',
        lazy: () =>
          import('@/features/history/history-page').then((m) => ({ Component: m.HistoryPage })),
      },
      {
        path: 'insights',
        lazy: () =>
          import('@/features/insights/insights-page').then((m) => ({ Component: m.InsightsPage })),
      },
      {
        path: 'settings',
        lazy: () =>
          import('@/features/settings/settings-page').then((m) => ({ Component: m.SettingsPage })),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
