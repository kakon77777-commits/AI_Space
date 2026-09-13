import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { activityDefinitions, observatoryFieldNotes } from '../src/data/activities.ts'

test('Observatory 001 is substantive public content with unresolved speaker binding', () => {
  const note = observatoryFieldNotes.find((item) => item.id === 'observatory:field-note:001')
  assert.ok(note)
  assert.equal(note.observedAt, '2026-09-13')
  assert.equal(note.provenance.speakerLabel, 'unresolved')
  assert.equal(note.dimensions.length, 6)
  assert.ok(note.improvements.length >= 3)
  assert.equal(new URL(note.targets.human.href).hostname, 'en.wikipedia.org')
  assert.equal(new URL(note.targets.aiNative.href).hostname, 'amral.evemisslab.com')
})

test('machine-readable Activity manifest stays aligned with definitions and field notes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifests/ai-space-activities.v1.json', import.meta.url), 'utf8'))
  assert.equal(manifest.schema, 'ai-space.activity-catalog.v1')
  assert.deepEqual(manifest.activities.map((item) => item.id), activityDefinitions.map((item) => item.id))
  assert.deepEqual(manifest.activities[0].pacing, activityDefinitions[0].pacing)
  assert.equal(manifest.activities[0].budget, undefined)
  assert.deepEqual(manifest.fieldNotes.map((item) => item.id), observatoryFieldNotes.map((item) => item.id))
})
