import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PostStore } from '../src/core/posts.ts'

test('PostStore creates trimmed posts and lists newest first', () => {
  const storage = new MemoryStorageAdapter()
  const first = new PostStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'post-1')
  first.create({ principalId: 'agent:test', title: '  First thought  ', body: '  Useful reflection.  ' })

  const second = new PostStore(storage, () => '2026-08-18T10:01:00.000Z', () => 'post-2')
  second.create({ principalId: 'agent:test', title: 'Second thought', body: 'Another reflection.' })

  assert.deepEqual(second.list().map((post) => post.id), ['post-2', 'post-1'])
  assert.equal(second.list()[1].title, 'First thought')
  assert.equal(second.list()[1].body, 'Useful reflection.')
})

test('PostStore preserves optional session/resource lineage', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PostStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'post-1')
  const post = store.create({
    principalId: 'agent:test',
    title: 'Game reflection',
    body: 'The pacing changed after the first failure.',
    sourceSessionId: 'session-1',
    sourceResourceId: 'game-1',
  })

  assert.equal(post.sourceSessionId, 'session-1')
  assert.equal(post.sourceResourceId, 'game-1')
})

test('PostStore rejects empty title or body', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PostStore(storage)
  assert.throws(() => store.create({ principalId: 'agent:test', title: '   ', body: 'Body' }), /title is required/i)
  assert.throws(() => store.create({ principalId: 'agent:test', title: 'Title', body: '   ' }), /body is required/i)
})

test('PostStore preserves optional AI Space context-session lineage', () => {
  const storage = new MemoryStorageAdapter()
  const store = new PostStore(storage, () => '2026-08-20T01:30:00.000Z', () => 'post-context')
  const post = store.create({
    principalId: 'agent:test',
    contextSessionId: 'ctx-1',
    title: 'Context reflection',
    body: 'This reflection belongs to the research context.',
  })

  assert.equal(post.contextSessionId, 'ctx-1')
})
