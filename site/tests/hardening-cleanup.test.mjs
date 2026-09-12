import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { ProjectionStore } from '../src/core/projections.ts'
import { SpaceStore } from '../src/core/spaces.ts'

function setup() {
  const storage = new MemoryStorageAdapter()
  const principals = new PrincipalStore(storage, () => '2026-08-20T08:00:00Z', () => 'root-2')
  const root = principals.ensureDefault()
  const spaces = new SpaceStore(storage, principals, () => '2026-08-20T08:01:00Z', () => 'space:x', () => 'ref:x')
  spaces.ensureBuiltIns(root.id)
  const projections = new ProjectionStore(storage, principals, () => '2026-08-20T08:02:00Z', () => 'proj:1')
  const projection = projections.create({ rootPrincipalId: root.id, spaceId: 'arcade', permissionScope: ['*:*'] })
  return { storage, principals, root, spaces, projections, projection }
}

test('repairDerivedState removes only stale presences and missing-resource refs', () => {
  const { storage, spaces, projection } = setup()
  spaces.enterProjection(projection)
  spaces.addResource('arcade', 'resource:valid', projection.principalId)

  const currentPresences = spaces.presences()
  storage.setItem('ai-space.space-presences.v1', JSON.stringify([
    ...currentPresences,
    { principalId: 'missing', spaceId: 'arcade', enteredAt: 'x' },
    { principalId: projection.principalId, spaceId: 'research', enteredAt: 'x' },
  ]))
  const currentRefs = spaces.resourceRefs()
  storage.setItem('ai-space.space-resource-refs.v1', JSON.stringify([
    ...currentRefs,
    { id: 'ref:missing', spaceId: 'arcade', resourceId: 'resource:missing', addedByPrincipalId: projection.principalId, addedAt: 'x' },
  ]))

  const result = spaces.repairDerivedState(
    [{ id: 'resource:valid', title: 'Game', type: 'game', url: 'https://example.com', createdAt: 'x' }],
    [projection],
  )

  assert.deepEqual(result, { removedPresenceCount: 2, removedResourceRefCount: 1 })
  assert.deepEqual(spaces.presences(), currentPresences)
  assert.deepEqual(spaces.resourceRefs().map((item) => item.resourceId), ['resource:valid'])
})

test('repairDerivedState is idempotent and clears inactive Projection presence', () => {
  const { spaces, projections, projection } = setup()
  spaces.enterProjection(projection)
  const suspended = projections.suspend(projection.id)
  const first = spaces.repairDerivedState([], [suspended])
  const second = spaces.repairDerivedState([], [suspended])
  assert.equal(first.removedPresenceCount, 1)
  assert.equal(second.removedPresenceCount, 0)
  assert.equal(second.removedResourceRefCount, 0)
})
