import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import {
  AI_SPACE_STATE_KEYS,
  exportAiSpaceStateBundle,
  parseAiSpaceStateBundle,
  validateAiSpaceStateBundle,
} from '../src/core/statePortability.ts'

test('exportAiSpaceStateBundle captures only the exact AI Space allowlist in deterministic key order', () => {
  const storage = new MemoryStorageAdapter()
  storage.setItem('ai-space.principals.v1', '[{"id":"agent:root"}]')
  storage.setItem('unrelated.key', 'do-not-export')
  const bundle = exportAiSpaceStateBundle(storage, { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  assert.deepEqual(Object.keys(bundle.entries), AI_SPACE_STATE_KEYS)
  assert.equal(bundle.entries['ai-space.principals.v1'], '[{"id":"agent:root"}]')
  assert.equal('unrelated.key' in bundle.entries, false)
  assert.equal(bundle.schemaVersion, '1.0')
  assert.equal(bundle.checksumAlgorithm, 'fnv1a32')
})

test('exportAiSpaceStateBundle checksum is deterministic for identical metadata and entries', () => {
  const storage = new MemoryStorageAdapter()
  storage.setItem('ai-space.events.v1', '[{"id":"e1"}]')
  const a = exportAiSpaceStateBundle(storage, { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  const b = exportAiSpaceStateBundle(storage, { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  assert.equal(a.checksum, b.checksum)
  assert.match(a.checksum, /^[0-9a-f]{8}$/)
})

test('validateAiSpaceStateBundle rejects checksum corruption before accepting a bundle', () => {
  const bundle = exportAiSpaceStateBundle(new MemoryStorageAdapter(), { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  bundle.entries['ai-space.events.v1'] = '[{"tampered":true}]'
  assert.throws(() => validateAiSpaceStateBundle(bundle), /checksum/i)
})

test('parseAiSpaceStateBundle rejects unsupported schema versions and unknown/missing keys', () => {
  const bundle = exportAiSpaceStateBundle(new MemoryStorageAdapter(), { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  const unsupported = JSON.stringify({ ...bundle, schemaVersion: '2.0' })
  assert.throws(() => parseAiSpaceStateBundle(unsupported), /schema version/i)

  const missing = structuredClone(bundle)
  delete missing.entries[AI_SPACE_STATE_KEYS[0]]
  assert.throws(() => validateAiSpaceStateBundle(missing), /entry keys/i)

  const extra = structuredClone(bundle)
  extra.entries['other.key'] = null
  assert.throws(() => validateAiSpaceStateBundle(extra), /entry keys/i)
})
