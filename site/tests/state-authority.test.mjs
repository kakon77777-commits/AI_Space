import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import * as portability from '../src/core/statePortability.ts'

const AUTHORITY_KEY = 'ai-space.state-authority.v1'

test('authoritative export creates v1.1 revision 1 and persists local authority', () => {
  assert.equal(typeof portability.exportAuthoritativeAiSpaceStateBundle, 'function')
  const storage = new MemoryStorageAdapter()
  storage.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'post-1' }]))
  const bundle = portability.exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T10:00:00.000Z',
    lineageIdFactory: () => 'lineage-A',
  })

  assert.equal(bundle.schemaVersion, '1.1')
  assert.deepEqual(bundle.authority, {
    lineageId: 'lineage-A',
    revision: 1,
    parentChecksum: null,
    stateFingerprint: bundle.authority.stateFingerprint,
  })
  assert.match(bundle.authority.stateFingerprint, /^[0-9a-f]{8}$/)

  const persisted = JSON.parse(storage.getItem(AUTHORITY_KEY))
  assert.equal(persisted.lineageId, 'lineage-A')
  assert.equal(persisted.revision, 1)
  assert.equal(persisted.headChecksum, bundle.checksum)
  assert.equal(persisted.stateFingerprint, bundle.authority.stateFingerprint)
})

test('second authoritative export increments revision and links direct parent checksum', () => {
  const storage = new MemoryStorageAdapter()
  const first = portability.exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T10:00:00.000Z',
    lineageIdFactory: () => 'lineage-A',
  })
  storage.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'post-2' }]))
  const second = portability.exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T10:01:00.000Z',
    lineageIdFactory: () => 'lineage-B-should-not-be-used',
  })

  assert.equal(second.authority.lineageId, 'lineage-A')
  assert.equal(second.authority.revision, 2)
  assert.equal(second.authority.parentChecksum, first.checksum)
  assert.notEqual(second.authority.stateFingerprint, first.authority.stateFingerprint)
})

test('v1.1 checksum covers authority metadata', () => {
  const storage = new MemoryStorageAdapter()
  const bundle = portability.exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T10:00:00.000Z',
    lineageIdFactory: () => 'lineage-A',
  })
  const tampered = structuredClone(bundle)
  tampered.authority.revision = 99
  assert.throws(() => portability.validateAiSpaceStateBundle(tampered), /checksum mismatch/i)
})

test('legacy v1.0 bundles remain valid', () => {
  const storage = new MemoryStorageAdapter()
  const legacy = portability.exportAiSpaceStateBundle(storage, {
    appVersion: '0.1.2',
    createdAt: '2026-08-20T09:00:00.000Z',
  })
  assert.equal(legacy.schemaVersion, '1.0')
  assert.equal(portability.validateAiSpaceStateBundle(legacy).schemaVersion, '1.0')
})
