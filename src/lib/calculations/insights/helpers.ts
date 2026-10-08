export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** 0.4 → "40%". */
export function percent(fraction: number): string {
  return `${Math.round(Math.abs(fraction) * 100)}%`
}

/** "Bench Press", "Bench Press and Squat", "A, B and C", or past `max`, "A, B and 5 more". */
export function joinNames(names: string[], max = 3): string {
  if (names.length <= 1) return names.join('')
  if (names.length > max) {
    return `${names.slice(0, max - 1).join(', ')} and ${names.length - max + 1} more`
  }
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}
