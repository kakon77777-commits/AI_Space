import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { catalogProbeTargets, makeReportFileName } from '../scripts/daily-check.mjs'

test('daily probe targets cover every world entry, Trellis mirror, and both AI Space domains', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifests/ai-space-worlds.v1.json', import.meta.url), 'utf8'))
  const targets = catalogProbeTargets(manifest)

  assert.equal(targets.length, 9)
  assert.equal(new Set(targets.map((target) => target.url)).size, targets.length)
  assert.ok(targets.some((target) => target.url === 'https://aispaces.app/healthz'))
  assert.ok(targets.some((target) => target.url === 'https://eveaispace.com/healthz'))
  assert.ok(targets.some((target) => target.url === 'https://trellis.eveaispace.com/'))
})

test('daily report names are filesystem-safe and timestamp-specific', () => {
  assert.equal(makeReportFileName('2026-09-12T06:30:45.123Z'), '2026-09-12T06-30-45-123Z.json')
})
