import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { ResourceStore, validateExternalUrl, selectGameResources } from '../src/core/resources.ts'

test('validateExternalUrl accepts HTTP(S) and normalizes the URL', () => {
  assert.equal(validateExternalUrl('https://example.com/path'), 'https://example.com/path')
  assert.equal(validateExternalUrl('http://example.com'), 'http://example.com/')
})

test('validateExternalUrl rejects non-web protocols', () => {
  assert.throws(() => validateExternalUrl('javascript:alert(1)'), /Only http and https/)
  assert.throws(() => validateExternalUrl('file:///tmp/test'), /Only http and https/)
})

test('ResourceStore persists resources and filters game resources', () => {
  const storage = new MemoryStorageAdapter()
  const store = new ResourceStore(storage, () => '2026-08-18T10:00:00.000Z', () => 'resource-1')
  store.add({ title: 'Example Game', type: 'game', url: 'https://example.com/game' })

  const reloaded = new ResourceStore(storage)
  assert.equal(reloaded.list().length, 1)
  assert.deepEqual(selectGameResources(reloaded.list()).map((resource) => resource.title), ['Example Game'])
})
