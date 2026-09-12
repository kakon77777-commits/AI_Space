import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { ContextSessionStore } from '../src/core/contextSessions.ts'

test('ContextSessionStore starts and closes a principal context session', () => {
  const storage = new MemoryStorageAdapter()
  const store = new ContextSessionStore(storage, () => '2026-08-20T01:10:00.000Z', () => 'ctx-1')
  const started = store.start({ principalId: 'agent:test', label: '  Research shift  ' })

  assert.equal(started.id, 'ctx-1')
  assert.equal(started.label, 'Research shift')
  assert.equal(started.status, 'active')
  assert.equal(store.getActive('agent:test')?.id, 'ctx-1')

  const closer = new ContextSessionStore(storage, () => '2026-08-20T02:00:00.000Z', () => 'unused')
  const closed = closer.close('ctx-1')

  assert.equal(closed.status, 'closed')
  assert.equal(closed.startedAt, '2026-08-20T01:10:00.000Z')
  assert.equal(closed.endedAt, '2026-08-20T02:00:00.000Z')
  assert.equal(closer.getActive('agent:test'), undefined)
})

test('ContextSessionStore allows one active context per principal and independent contexts for different principals', () => {
  const storage = new MemoryStorageAdapter()
  let id = 0
  const store = new ContextSessionStore(storage, () => '2026-08-20T01:10:00.000Z', () => `ctx-${++id}`)

  store.start({ principalId: 'agent:a', label: 'A work' })
  assert.throws(() => store.start({ principalId: 'agent:a', label: 'A second work' }), /already active/i)

  const other = store.start({ principalId: 'agent:b', label: 'B work' })
  assert.equal(other.principalId, 'agent:b')
  assert.equal(store.getActive('agent:b')?.id, 'ctx-2')
})

test('ContextSessionStore rejects blank labels and closing unknown or already-closed sessions', () => {
  const storage = new MemoryStorageAdapter()
  const store = new ContextSessionStore(storage, () => '2026-08-20T01:10:00.000Z', () => 'ctx-1')

  assert.throws(() => store.start({ principalId: 'agent:a', label: '   ' }), /label is required/i)
  assert.throws(() => store.close('ctx-missing'), /context session not found/i)

  store.start({ principalId: 'agent:a', label: 'A work' })
  store.close('ctx-1')
  assert.throws(() => store.close('ctx-1'), /already closed/i)
})
