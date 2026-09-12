import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { SpaceStore } from '../src/core/spaces.ts'

function setup() {
  const storage = new MemoryStorageAdapter()
  let principalCounter = 0
  let spaceCounter = 0
  let refCounter = 0
  const principals = new PrincipalStore(
    storage,
    () => '2026-08-20T03:10:00.000Z',
    () => `principal-${++principalCounter}`,
  )
  const owner = principals.ensureDefault()
  const spaces = new SpaceStore(
    storage,
    principals,
    () => '2026-08-20T03:11:00.000Z',
    () => `space:${++spaceCounter}`,
    () => `space-ref:${++refCounter}`,
  )
  return { storage, principals, owner, spaces }
}

test('SpaceStore seeds stable built-in Spaces idempotently with owner membership', () => {
  const { owner, spaces } = setup()
  spaces.ensureBuiltIns(owner.id)
  spaces.ensureBuiltIns(owner.id)

  assert.deepEqual(spaces.list().map((space) => space.id), ['arcade', 'board', 'library', 'research'])
  for (const id of ['research', 'arcade', 'board', 'library']) {
    const space = spaces.get(id)
    assert.equal(space?.ownerPrincipalId, owner.id)
    assert.equal(space?.status, 'active')
    assert.equal(space?.visibility, 'shared')
    assert.deepEqual(spaces.memberships(id).map((membership) => [membership.principalId, membership.role]), [[owner.id, 'owner']])
  }
})

test('SpaceStore creates a Space with a non-Projection owner and automatic owner membership', () => {
  const { principals, spaces } = setup()
  const owner = principals.create({ type: 'agent', displayName: 'Research Root' })
  const space = spaces.create({ ownerPrincipalId: owner.id, name: '  Shared Research  ', description: '  proof work  ', visibility: 'shared' })

  assert.equal(space.id, 'space:1')
  assert.equal(space.name, 'Shared Research')
  assert.equal(space.description, 'proof work')
  assert.equal(space.ownerPrincipalId, owner.id)
  assert.equal(space.visibility, 'shared')
  assert.equal(space.status, 'active')
  assert.deepEqual(spaces.memberships(space.id).map((membership) => [membership.principalId, membership.role]), [[owner.id, 'owner']])
})

test('SpaceStore rejects missing/Projection owners and empty names', () => {
  const { principals, spaces } = setup()
  const root = principals.create({ type: 'agent', displayName: 'Root' })
  const projectionPrincipal = principals.createProjectionPrincipal({ displayName: 'Slice', rootPrincipalId: root.id })

  assert.throws(() => spaces.create({ ownerPrincipalId: 'missing', name: 'X', visibility: 'shared' }), /owner principal not found/i)
  assert.throws(() => spaces.create({ ownerPrincipalId: projectionPrincipal.id, name: 'X', visibility: 'shared' }), /projection.*owner/i)
  assert.throws(() => spaces.create({ ownerPrincipalId: root.id, name: '   ', visibility: 'shared' }), /space name is required/i)
})

test('shared Space membership is owner-governed and only accepts root Principals', () => {
  const { principals, spaces, owner } = setup()
  const member = principals.create({ type: 'human', displayName: 'Human Member' })
  const stranger = principals.create({ type: 'service', displayName: 'Service' })
  const projectionPrincipal = principals.createProjectionPrincipal({ displayName: 'Slice', rootPrincipalId: owner.id })
  const space = spaces.create({ ownerPrincipalId: owner.id, name: 'Shared', visibility: 'shared' })

  assert.throws(() => spaces.addMember(space.id, member.id, stranger.id), /only the space owner/i)
  const membership = spaces.addMember(space.id, member.id, owner.id)
  assert.equal(membership.role, 'member')
  assert.equal(membership.principalId, member.id)
  assert.throws(() => spaces.addMember(space.id, member.id, owner.id), /already a member/i)
  assert.throws(() => spaces.addMember(space.id, projectionPrincipal.id, owner.id), /projection.*membership/i)
})

test('private Spaces reject added members and owner membership cannot be removed', () => {
  const { principals, spaces, owner } = setup()
  const member = principals.create({ type: 'human', displayName: 'Member' })
  const privateSpace = spaces.create({ ownerPrincipalId: owner.id, name: 'Private', visibility: 'private' })
  assert.throws(() => spaces.addMember(privateSpace.id, member.id, owner.id), /private space/i)
  assert.throws(() => spaces.removeMember(privateSpace.id, owner.id, owner.id), /owner membership/i)
})

import { ProjectionStore } from '../src/core/projections.ts'
import { assertProjectionSpaceBinding, assertProjectionSpacePresence, selectSpaceEvents } from '../src/core/spaces.ts'

test('root Principal presence requires membership and enforces one active Space at a time', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const member = principals.create({ type: 'human', displayName: 'Member' })
  spaces.addMember('research', member.id, owner.id)

  const presence = spaces.enterRoot(member.id, 'research')
  assert.equal(presence.principalId, member.id)
  assert.equal(presence.spaceId, 'research')
  assert.deepEqual(spaces.getActivePresence(member.id), presence)
  assert.throws(() => spaces.enterRoot(member.id, 'arcade'), /leave.*current space/i)

  const left = spaces.leave(member.id)
  assert.equal(left.spaceId, 'research')
  assert.equal(spaces.getActivePresence(member.id), undefined)
  assert.throws(() => spaces.leave(member.id), /not currently in a space/i)
})

test('root Principal cannot enter a Space without membership or an archived Space', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const stranger = principals.create({ type: 'human', displayName: 'Stranger' })
  assert.throws(() => spaces.enterRoot(stranger.id, 'research'), /space membership is required/i)
  spaces.archive('research', owner.id)
  assert.throws(() => spaces.enterRoot(owner.id, 'research'), /archived space/i)
})

test('Projection presence requires active binding to an active Space whose root is a member', () => {
  const { storage, principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const projections = new ProjectionStore(
    storage,
    principals,
    () => '2026-08-20T03:12:00.000Z',
    () => 'proj:space',
    () => 'checkpoint:space',
    () => 'merge:space',
  )
  const projection = projections.create({ rootPrincipalId: owner.id, spaceId: 'research', permissionScope: ['*:*'] })
  const presence = spaces.enterProjection(projection)
  assert.equal(presence.principalId, projection.principalId)
  assert.equal(presence.spaceId, 'research')
  assert.doesNotThrow(() => assertProjectionSpacePresence(spaces, projection))

  spaces.leave(projection.principalId)
  assert.throws(() => assertProjectionSpacePresence(spaces, projection), /entered into its bound space/i)
  projections.suspend(projection.id)
  assert.throws(() => spaces.enterProjection(projections.get(projection.id)), /active projection/i)
})

test('Projection Space binding validation rejects missing, archived, or non-member Spaces', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const other = principals.create({ type: 'agent', displayName: 'Other Root' })

  assert.doesNotThrow(() => assertProjectionSpaceBinding(spaces, owner.id, 'research'))
  assert.throws(() => assertProjectionSpaceBinding(spaces, other.id, 'research'), /root principal.*member/i)
  assert.throws(() => assertProjectionSpaceBinding(spaces, owner.id, 'missing'), /space not found/i)
  spaces.archive('research', owner.id)
  assert.throws(() => assertProjectionSpaceBinding(spaces, owner.id, 'research'), /archived space/i)
})

test('archiving a Space is owner-only, terminal for entry, and clears active presences', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const member = principals.create({ type: 'human', displayName: 'Member' })
  spaces.addMember('research', member.id, owner.id)
  spaces.enterRoot(owner.id, 'research')
  spaces.enterRoot(member.id, 'research')

  assert.throws(() => spaces.archive('research', member.id), /only the space owner/i)
  const archived = spaces.archive('research', owner.id)
  assert.equal(archived.status, 'archived')
  assert.equal(archived.archivedAt, '2026-08-20T03:11:00.000Z')
  assert.equal(spaces.presences('research').length, 0)
  assert.throws(() => spaces.archive('research', owner.id), /already archived/i)
})

test('Space resource refs reference canonical resources and require actor Space access', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const member = principals.create({ type: 'human', displayName: 'Member' })
  const stranger = principals.create({ type: 'service', displayName: 'Stranger' })
  spaces.addMember('research', member.id, owner.id)

  const ref = spaces.addResource('research', 'resource:paper', member.id)
  assert.equal(ref.id, 'space-ref:1')
  assert.equal(ref.spaceId, 'research')
  assert.equal(ref.resourceId, 'resource:paper')
  assert.equal(ref.addedByPrincipalId, member.id)
  assert.throws(() => spaces.addResource('research', 'resource:paper', owner.id), /already linked/i)
  assert.throws(() => spaces.addResource('research', 'resource:other', stranger.id), /space access is required/i)
  assert.deepEqual(spaces.resourceRefs('research').map((item) => item.resourceId), ['resource:paper'])
})

test('Projection may add a resource only while actively present in its bound Space', () => {
  const { storage, principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const projections = new ProjectionStore(storage, principals, undefined, () => 'proj:resource')
  const projection = projections.create({ rootPrincipalId: owner.id, spaceId: 'arcade', permissionScope: ['*:*'] })

  assert.throws(() => spaces.addResource('arcade', 'resource:game', projection.principalId), /space access is required/i)
  spaces.enterProjection(projection)
  const ref = spaces.addResource('arcade', 'resource:game', projection.principalId)
  assert.equal(ref.addedByPrincipalId, projection.principalId)
})

test('selectSpaceEvents is a projection over the global Event list, not a second history store', () => {
  const events = [
    { id: '1', timestamp: '2026-08-20T01:00:00Z', principalId: 'p', spaceId: 'research', action: 'A', summary: 'r' },
    { id: '2', timestamp: '2026-08-20T02:00:00Z', principalId: 'p', spaceId: 'arcade', action: 'B', summary: 'a' },
    { id: '3', timestamp: '2026-08-20T03:00:00Z', principalId: 'p', action: 'C', summary: 'global' },
  ]
  assert.deepEqual(selectSpaceEvents(events, 'research').map((event) => event.id), ['1'])
})

test('removing a member also clears that Principal active presence in the Space', () => {
  const { principals, spaces, owner } = setup()
  spaces.ensureBuiltIns(owner.id)
  const member = principals.create({ type: 'human', displayName: 'Member' })
  spaces.addMember('research', member.id, owner.id)
  spaces.enterRoot(member.id, 'research')
  spaces.removeMember('research', member.id, owner.id)
  assert.equal(spaces.getActivePresence(member.id), undefined)
})
