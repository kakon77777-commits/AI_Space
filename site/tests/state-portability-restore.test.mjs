import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import {
  exportAiSpaceStateBundle,
  previewAiSpaceStateRestore,
  validateAiSpaceStateRestore,
  restoreAiSpaceStateBundle,
} from '../src/core/statePortability.ts'

function seedRoot(storage, id = 'agent:root') {
  storage.setItem('ai-space.principals.v1', JSON.stringify([{ id, type: 'agent', displayName: id, createdAt: 'x', updatedAt: 'x' }]))
  storage.setItem('ai-space.active-principal.v1', id)
}

function makeBundle(id = 'agent:source') {
  const source = new MemoryStorageAdapter()
  seedRoot(source, id)
  return exportAiSpaceStateBundle(source, { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
}

test('previewAiSpaceStateRestore reports changes without mutating target storage', () => {
  const target = new MemoryStorageAdapter()
  seedRoot(target, 'agent:target')
  target.setItem('unrelated.key', 'keep')
  const beforePrincipals = target.getItem('ai-space.principals.v1')
  const preview = previewAiSpaceStateRestore(makeBundle(), target)
  assert.equal(preview.changed >= 2, true)
  assert.equal(target.getItem('ai-space.principals.v1'), beforePrincipals)
  assert.equal(target.getItem('unrelated.key'), 'keep')
})

test('validateAiSpaceStateRestore rejects staged cross-store invariant damage before target mutation', () => {
  const source = new MemoryStorageAdapter()
  seedRoot(source)
  source.setItem('ai-space.projections.v1', JSON.stringify([{ id: 'proj:bad', principalId: 'projection:missing', rootPrincipalId: 'agent:root', spaceId: 'missing-space', status: 'active', permissionScope: [], memoryScope: [], mergePolicy: 'reviewed', createdAt: 'x', updatedAt: 'x' }]))
  const bundle = exportAiSpaceStateBundle(source, { appVersion: '0.1.2', createdAt: '2026-08-20T00:00:00.000Z' })
  const target = new MemoryStorageAdapter()
  seedRoot(target, 'agent:target')
  const before = target.getItem('ai-space.principals.v1')
  assert.throws(() => validateAiSpaceStateRestore(bundle, { capabilities: [] }), /staged state audit failed/i)
  assert.equal(target.getItem('ai-space.principals.v1'), before)
})

test('restoreAiSpaceStateBundle replaces only AI Space allowlisted keys and leaves unrelated storage untouched', () => {
  const target = new MemoryStorageAdapter()
  seedRoot(target, 'agent:target')
  target.setItem('unrelated.key', 'keep')
  const result = restoreAiSpaceStateBundle(makeBundle('agent:source'), target, { capabilities: [] })
  assert.equal(JSON.parse(target.getItem('ai-space.principals.v1'))[0].id, 'agent:source')
  assert.equal(target.getItem('ai-space.active-principal.v1'), 'agent:source')
  assert.equal(target.getItem('unrelated.key'), 'keep')
  assert.equal(result.audit.errorCount, 0)
})

class FailOnceStorage {
  constructor(inner, failOnWrite) { this.inner = inner; this.failOnWrite = failOnWrite; this.writeCount = 0; this.failed = false }
  getItem(key) { return this.inner.getItem(key) }
  setItem(key, value) {
    this.writeCount++
    if (!this.failed && this.writeCount === this.failOnWrite) { this.failed = true; throw new Error('simulated write failure') }
    this.inner.setItem(key, value)
  }
  removeItem(key) {
    this.writeCount++
    if (!this.failed && this.writeCount === this.failOnWrite) { this.failed = true; throw new Error('simulated write failure') }
    this.inner.removeItem(key)
  }
}

test('restoreAiSpaceStateBundle rolls back allowlisted state if target commit throws midway', () => {
  const inner = new MemoryStorageAdapter()
  seedRoot(inner, 'agent:before')
  inner.setItem('ai-space.events.v1', JSON.stringify([{ id: 'before' }]))
  const beforePrincipals = inner.getItem('ai-space.principals.v1')
  const beforeActive = inner.getItem('ai-space.active-principal.v1')
  const beforeEvents = inner.getItem('ai-space.events.v1')
  const target = new FailOnceStorage(inner, 3)
  assert.throws(() => restoreAiSpaceStateBundle(makeBundle('agent:after'), target, { capabilities: [] }), /simulated write failure/i)
  assert.equal(inner.getItem('ai-space.principals.v1'), beforePrincipals)
  assert.equal(inner.getItem('ai-space.active-principal.v1'), beforeActive)
  assert.equal(inner.getItem('ai-space.events.v1'), beforeEvents)
})
