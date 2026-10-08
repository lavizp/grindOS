import { Angry, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react'

export interface QualityLevel {
  value: 1 | 2 | 3 | 4 | 5
  label: string
  icon: LucideIcon
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { value: 1, label: 'Awful', icon: Angry },
  { value: 2, label: 'Poor', icon: Frown },
  { value: 3, label: 'Okay', icon: Meh },
  { value: 4, label: 'Good', icon: Smile },
  { value: 5, label: 'Great', icon: Laugh },
]

export function qualityLevel(value: number | null | undefined): QualityLevel | undefined {
  return QUALITY_LEVELS.find((q) => q.value === value)
}
