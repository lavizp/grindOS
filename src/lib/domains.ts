import { BedDouble, Dumbbell, Wallet, type LucideIcon } from 'lucide-react'

export type Domain = 'workout' | 'sleep' | 'spending'

export interface DomainConfig {
  label: string
  /** Name of a single entry, used in "Log a workout" etc. */
  entryLabel: string
  icon: LucideIcon
  path: string
  newPath: string
  /** Static class strings so Tailwind can see them. */
  text: string
  bg: string
  softBg: string
  ring: string
}

export const DOMAINS: Record<Domain, DomainConfig> = {
  workout: {
    label: 'Workout',
    entryLabel: 'workout',
    icon: Dumbbell,
    path: '/workouts',
    newPath: '/workouts/new',
    text: 'text-workout',
    bg: 'bg-workout',
    softBg: 'bg-workout-soft',
    ring: 'ring-workout/40',
  },
  sleep: {
    label: 'Sleep',
    entryLabel: 'sleep',
    icon: BedDouble,
    path: '/sleep',
    newPath: '/sleep/new',
    text: 'text-sleep',
    bg: 'bg-sleep',
    softBg: 'bg-sleep-soft',
    ring: 'ring-sleep/40',
  },
  spending: {
    label: 'Spending',
    entryLabel: 'payment',
    icon: Wallet,
    path: '/spending',
    newPath: '/spending/new',
    text: 'text-spending',
    bg: 'bg-spending',
    softBg: 'bg-spending-soft',
    ring: 'ring-spending/40',
  },
}

export const DOMAIN_ORDER: Domain[] = ['workout', 'sleep', 'spending']
