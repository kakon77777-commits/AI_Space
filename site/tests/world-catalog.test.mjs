import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { WORLD_CATALOG_CHECKED_AT, worlds } from '../src/data/worlds.ts'

test('public world catalog exposes the six launch worlds with stable unique ids', () => {
  assert.equal(WORLD_CATALOG_CHECKED_AT, '2026-09-12')
  assert.equal(worlds.length, 6)
  assert.equal(new Set(worlds.map((world) => world.id)).size, worlds.length)
  assert.deepEqual(
    worlds.map((world) => world.id),
    ['storyforge', 'trellis', 'amral', 'unbounded-axiom', 'agiright', 'ai-board'],
  )
})

test('every public world has an https entry point and Trellis records its mirror', () => {
  for (const world of worlds) {
    assert.equal(new URL(world.href).protocol, 'https:')
    assert.ok(world.actions.length > 0)
    assert.ok(world.description.length > 30)
  }

  const trellis = worlds.find((world) => world.id === 'trellis')
  assert.equal(trellis?.href, 'https://trellis.aispaces.app/')
  assert.equal(trellis?.mirrorHref, 'https://trellis.eveaispace.com/')
})

test('machine-readable launch manifest stays aligned with the UI catalog', async () => {
  const raw = await readFile(new URL('../public/manifests/ai-space-worlds.v1.json', import.meta.url), 'utf8')
  const manifest = JSON.parse(raw)

  assert.equal(manifest.schema, 'ai-space.world-catalog.v1')
  assert.equal(manifest.checkedAt, WORLD_CATALOG_CHECKED_AT)
  assert.deepEqual(
    manifest.worlds.map((world) => ({ id: world.id, href: world.href })),
    worlds.map((world) => ({ id: world.id, href: world.href })),
  )
})
