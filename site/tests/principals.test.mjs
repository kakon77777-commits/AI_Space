import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'

test('PrincipalStore seeds the backward-compatible local demo principal exactly once', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PrincipalStore(storage, () => '2026-08-20T01:00:00.000Z', () => 'unused')

  const first = store.ensureDefault()
  const second = store.ensureDefault()

  assert.equal(first.id, 'agent:local-demo')
  assert.equal(first.type, 'agent')
  assert.equal(first.displayName, 'Local Demo Agent')
  assert.equal(first.provider, 'local')
  assert.equal(first.modelFamily, 'demo')
  assert.equal(first.instanceId, 'local-demo')
  assert.equal(second.id, first.id)
  assert.equal(store.list().length, 1)
  assert.equal(store.getActive().id, 'agent:local-demo')
})

test('PrincipalStore creates and persists typed principals with trimmed display names', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PrincipalStore(storage, () => '2026-08-20T01:01:00.000Z', () => 'abc123')
  store.ensureDefault()

  const created = store.create({
    type: 'agent',
    displayName: '  Research Agent  ',
    ownerId: 'human:neo',
    provider: 'openai',
    modelFamily: 'gpt',
    instanceId: 'research-01',
  })

  assert.equal(created.id, 'agent:abc123')
  assert.equal(created.displayName, 'Research Agent')
  assert.equal(created.ownerId, 'human:neo')
  assert.equal(created.createdAt, '2026-08-20T01:01:00.000Z')
  assert.equal(created.updatedAt, '2026-08-20T01:01:00.000Z')

  const reloaded = new PrincipalStore(storage)
  assert.equal(reloaded.get('agent:abc123')?.displayName, 'Research Agent')
})

test('PrincipalStore rejects blank display names and selecting unknown principals', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PrincipalStore(storage)
  store.ensureDefault()

  assert.throws(() => store.create({ type: 'human', displayName: '   ' }), /display name is required/i)
  assert.throws(() => store.setActive('agent:missing'), /principal not found/i)
})

test('PrincipalStore persists active-principal selection', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PrincipalStore(storage, () => '2026-08-20T01:02:00.000Z', () => 'service-1')
  store.ensureDefault()
  const service = store.create({ type: 'service', displayName: 'Indexer' })

  const active = store.setActive(service.id)
  const reloaded = new PrincipalStore(storage)

  assert.equal(active.id, 'service:service-1')
  assert.equal(reloaded.getActive().id, 'service:service-1')
})

test('PrincipalStore rejects direct Projection creation outside ProjectionStore', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PrincipalStore(storage, () => '2026-08-20T02:40:00.000Z', () => 'projection-bypass')
  store.ensureDefault()

  assert.throws(
    () => store.create({ type: 'projection', displayName: 'Bypass Projection' }),
    /projection principals must be created through projection runtime/i,
  )
})
