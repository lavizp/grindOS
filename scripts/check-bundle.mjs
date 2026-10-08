// Fails when the JavaScript loaded at startup grows past its budget.
// Run after `pnpm build`: `pnpm size`.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

/** Gzipped JavaScript the first screen needs. Recharts and other pages load later. */
const STARTUP_JS_BUDGET_KB = 230
/** The biggest chunk loaded on demand (the charts). */
const LAZY_CHUNK_BUDGET_KB = 130

const dist = 'dist'
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length / 1024
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const startup = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
const startupKb = startup.reduce((sum, file) => sum + gz(file), 0)
const lazy = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js') && !startup.includes(`assets/${f}`))
  .map((f) => ({ file: f, kb: gz(`assets/${f}`) }))
  .sort((a, b) => b.kb - a.kb)

const row = (label, kb, budget) =>
  `${kb > budget ? 'OVER' : 'ok  '}  ${label.padEnd(44)} ${kb.toFixed(1).padStart(7)} kB  (budget ${budget} kB)`
console.log(row(`startup JS (${startup.length} files)`, startupKb, STARTUP_JS_BUDGET_KB))
console.log(
  row(`largest lazy chunk: ${lazy[0]?.file ?? 'none'}`, lazy[0]?.kb ?? 0, LAZY_CHUNK_BUDGET_KB),
)

if (startupKb > STARTUP_JS_BUDGET_KB || (lazy[0]?.kb ?? 0) > LAZY_CHUNK_BUDGET_KB) {
  console.error('\nOver budget. Check for an import that pulled a page or library into startup.')
  process.exit(1)
}
