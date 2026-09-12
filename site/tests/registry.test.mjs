import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveCapability, getNavigationCapabilities, mergeCapabilities } from '../src/core/registry.ts'

const capabilities = [
  { id: 'home', label: 'Home', description: '', route: '/', mode: 'native', status: 'ready', actions: [], navigation: { visible: true, order: 0 } },
  { id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready', actions: [], navigation: { visible: true, order: 2 } },
  { id: 'hidden', label: 'Hidden', description: '', route: '/hidden', mode: 'api', status: 'placeholder', actions: [], navigation: { visible: false, order: 1 } }
]

test('resolveCapability finds exact normalized routes', () => {
  assert.equal(resolveCapability(capabilities, '/arcade/')?.id, 'arcade')
  assert.equal(resolveCapability(capabilities, '')?.id, 'home')
  assert.equal(resolveCapability(capabilities, '/missing'), undefined)
})

test('getNavigationCapabilities filters hidden entries and sorts by order', () => {
  assert.deepEqual(getNavigationCapabilities(capabilities).map((item) => item.id), ['home', 'arcade'])
})

test('mergeCapabilities appends collision-free discovered capabilities', () => {
  const merged = mergeCapabilities(capabilities, [
    { id: 'child:docs', label: 'Docs', description: '', route: '/docs', mode: 'link', status: 'ready', actions: ['OPEN'], navigation: { visible: false, order: 20 } },
  ])
  assert.equal(merged.at(-1).id, 'child:docs')
})

test('mergeCapabilities rejects duplicate IDs and normalized route collisions', () => {
  assert.throws(
    () => mergeCapabilities(capabilities, [{ id: 'arcade', label: 'Duplicate', description: '', route: '/other', mode: 'link', status: 'ready', actions: [] }]),
    /duplicate capability id/i,
  )
  assert.throws(
    () => mergeCapabilities(capabilities, [{ id: 'child:arcade-shadow', label: 'Shadow', description: '', route: '/arcade/', mode: 'link', status: 'ready', actions: [] }]),
    /route collision/i,
  )
})
