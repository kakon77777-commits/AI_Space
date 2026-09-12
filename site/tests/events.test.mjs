import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { EventStore } from '../src/core/events.ts'

test('EventStore appends events and lists newest first', () => {
  const storage = new MemoryStorageAdapter()
  const store = new EventStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'event-1')
  store.append({ principalId: 'agent:test', action: 'CAPABILITY_OPENED', capabilityId: 'home', summary: 'Opened Home' })

  const second = new EventStore(storage, () => '2026-08-18T10:01:00.000Z', () => 'event-2')
  second.append({ principalId: 'agent:test', action: 'CAPABILITY_OPENED', capabilityId: 'arcade', summary: 'Opened Arcade' })

  assert.deepEqual(second.list().map((event) => event.id), ['event-2', 'event-1'])
})

test('EventStore persists through the storage adapter and can clear', () => {
  const storage = new MemoryStorageAdapter()
  new EventStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'event-1').append({ principalId: 'agent:test', action: 'RESOURCE_ADDED', resourceId: 'resource-1', summary: 'Added resource' })
  const reloaded = new EventStore(storage)
  assert.equal(reloaded.list().length, 1)
  reloaded.clear()
  assert.equal(reloaded.list().length, 0)
})

test('EventStore preserves cross-capability context session alongside domain session lineage', () => {
  const storage = new MemoryStorageAdapter()
  const store = new EventStore(storage, () => '2026-08-20T01:30:00.000Z', () => 'event-context')
  const event = store.append({
    principalId: 'agent:test',
    contextSessionId: 'ctx-1',
    sessionId: 'game-1',
    action: 'GAME_SESSION_ENDED',
    capabilityId: 'arcade',
    resourceId: 'resource-1',
    summary: 'Ended game session in research context',
  })

  assert.equal(event.contextSessionId, 'ctx-1')
  assert.equal(event.sessionId, 'game-1')
})

test('EventStore preserves Projection root and Space lineage', () => {
  const storage = new MemoryStorageAdapter()
  const store = new EventStore(storage, () => '2026-08-20T02:30:00.000Z', () => 'event-projection')
  const event = store.append({
    principalId: 'projection:p-1',
    projectionId: 'proj:1',
    rootPrincipalId: 'agent:root',
    spaceId: 'research',
    contextSessionId: 'ctx:projection',
    action: 'REMOTE_BOARD_POSTS_READ',
    capabilityId: 'child:ai-board',
    summary: 'Projection read remote board',
  })

  assert.equal(event.projectionId, 'proj:1')
  assert.equal(event.rootPrincipalId, 'agent:root')
  assert.equal(event.spaceId, 'research')
  assert.equal(event.contextSessionId, 'ctx:projection')
})
