import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { NotFoundPage } from '@/features/not-found-page'

// Home is eager so the app opens instantly. Every other page is split out,
// which keeps Recharts out of the initial bundle.

const workoutSheet = () =>
  import('@/features/workouts/workout-sheet').then((m) => ({ Component: m.WorkoutSheet }))

const sleepSheet = () =>
  import('@/features/sleep/sleep-sheet').then((m) => ({ Component: m.SleepSheet }))

const templateSheet = () =>
  import('@/features/templates/template-sheet').then((m) => ({ Component: m.TemplateSheet }))

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
          { path: 'new', lazy: workoutSheet },
          { path: ':id', lazy: workoutSheet },
        ],
      },
      {
        // Outranks /workouts/:id because a static segment beats a dynamic one.
        path: 'workouts/exercises/:exerciseId',
        lazy: () =>
          import('@/features/workouts/exercise-page').then((m) => ({ Component: m.ExercisePage })),
      },
      {
        path: 'sleep',
        lazy: () => import('@/features/sleep/sleep-page').then((m) => ({ Component: m.SleepPage })),
        children: [
          { path: 'new', lazy: sleepSheet },
          { path: ':id', lazy: sleepSheet },
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
      {
        path: 'settings/categories',
        lazy: () =>
          import('@/features/settings/categories-page').then((m) => ({
            Component: m.CategoriesPage,
          })),
      },
      {
        path: 'settings/exercises',
        lazy: () =>
          import('@/features/settings/exercises-page').then((m) => ({
            Component: m.ExercisesPage,
          })),
      },
      {
        path: 'settings/templates',
        lazy: () =>
          import('@/features/templates/templates-page').then((m) => ({
            Component: m.TemplatesPage,
          })),
        children: [
          { path: 'new', lazy: templateSheet },
          { path: ':id', lazy: templateSheet },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
