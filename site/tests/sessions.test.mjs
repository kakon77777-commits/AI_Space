import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { SessionStore } from '../src/core/sessions.ts'

test('SessionStore starts a game session and lists it as active', () => {
  const storage = new MemoryStorageAdapter()
  const store = new SessionStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'session-1')
  const session = store.start({ principalId: 'agent:test', resourceId: 'game-1' })

  assert.equal(session.status, 'active')
  assert.equal(session.startedAt, '2026-08-18T10:00:00.000Z')
  assert.deepEqual(store.listActive().map((item) => item.id), ['session-1'])
})

test('SessionStore completes an active session and preserves start time', () => {
  const storage = new MemoryStorageAdapter()
  new SessionStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'session-1').start({ principalId: 'agent:test', resourceId: 'game-1' })
  const store = new SessionStore(storage, () => '2026-08-18T10:30:00.000Z', () => 'unused')
  const completed = store.complete('session-1')

  assert.equal(completed.status, 'completed')
  assert.equal(completed.startedAt, '2026-08-18T10:00:00.000Z')
  assert.equal(completed.endedAt, '2026-08-18T10:30:00.000Z')
  assert.equal(store.listActive().length, 0)
})

test('SessionStore prevents two active sessions for the same principal/resource pair', () => {
  const storage = new MemoryStorageAdapter()
  const store = new SessionStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'session-1')
  store.start({ principalId: 'agent:test', resourceId: 'game-1' })
  assert.throws(() => store.start({ principalId: 'agent:test', resourceId: 'game-1' }), /already active/i)
})

test('SessionStore links a reflection post to a completed session', () => {
  const storage = new MemoryStorageAdapter()
  new SessionStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'session-1').start({ principalId: 'agent:test', resourceId: 'game-1' })
  const completedStore = new SessionStore(storage, () => '2026-08-18T10:30:00.000Z', () => 'unused')
  completedStore.complete('session-1')
  const linked = completedStore.linkReflection('session-1', 'post-1')

  assert.equal(linked.reflectionPostId, 'post-1')
})

test('SessionStore preserves the AI Space context session active when the game session begins', () => {
  const storage = new MemoryStorageAdapter()
  const store = new SessionStore(storage, () => '2026-08-20T01:30:00.000Z', () => 'session-context')
  const session = store.start({ principalId: 'agent:test', resourceId: 'game-1', contextSessionId: 'ctx-1' })

  assert.equal(session.contextSessionId, 'ctx-1')
})
