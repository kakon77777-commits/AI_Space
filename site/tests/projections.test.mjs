import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { ProjectionStore, projectionAllows } from '../src/core/projections.ts'

function makeStores() {
  const storage = new MemoryStorageAdapter()
  let principalId = 0
  let projectionId = 0
  const principals = new PrincipalStore(
    storage,
    () => '2026-08-20T02:00:00.000Z',
    () => `p-${++principalId}`,
  )
  principals.ensureDefault()
  const projections = new ProjectionStore(
    storage,
    principals,
    () => '2026-08-20T02:01:00.000Z',
    () => `proj:${++projectionId}`,
    () => 'checkpoint:1',
    () => 'merge:1',
  )
  return { storage, principals, projections }
}

test('ProjectionStore creates a bounded Projection Principal with explicit root and Space lineage', () => {
  const { principals, projections } = makeStores()
  const root = principals.create({ type: 'agent', displayName: 'Research Root', provider: 'local', modelFamily: 'demo' })

  const projection = projections.create({
    rootPrincipalId: root.id,
    spaceId: '  research  ',
    displayName: '  Research Slice  ',
    role: '  critic  ',
    permissionScope: [' child:ai-board:LIST_MESSAGES ', 'child:ai-board:LIST_MESSAGES', '', 'board:*'],
    memoryScope: [' paper-index ', 'paper-index', '', 'recent-checkpoints'],
    mergePolicy: 'reviewed',
  })

  const principal = principals.get(projection.principalId)
  assert.equal(projection.id, 'proj:1')
  assert.equal(projection.rootPrincipalId, root.id)
  assert.equal(projection.spaceId, 'research')
  assert.equal(projection.role, 'critic')
  assert.deepEqual(projection.permissionScope, ['child:ai-board:LIST_MESSAGES', 'board:*'])
  assert.deepEqual(projection.memoryScope, ['paper-index', 'recent-checkpoints'])
  assert.equal(projection.status, 'active')
  assert.equal(projection.mergePolicy, 'reviewed')

  assert.equal(principal?.type, 'projection')
  assert.equal(principal?.displayName, 'Research Slice')
  assert.equal(principal?.ownerId, root.id)
  assert.equal(projections.getByPrincipalId(projection.principalId)?.id, projection.id)

  const reloaded = new ProjectionStore(new MemoryStorageAdapter(), principals)
  assert.equal(reloaded.list().length, 0, 'different storage must not share projection records')
})

test('ProjectionStore persists records in the shared StorageAdapter', () => {
  const { storage, principals, projections } = makeStores()
  const root = principals.get('agent:local-demo')
  const created = projections.create({ rootPrincipalId: root.id, spaceId: 'arcade', permissionScope: [] })

  const reloaded = new ProjectionStore(storage, principals)
  assert.equal(reloaded.get(created.id)?.principalId, created.principalId)
  assert.equal(reloaded.getByPrincipalId(created.principalId)?.spaceId, 'arcade')
})

test('ProjectionStore rejects missing roots, blank spaces, and nested projection roots', () => {
  const { principals, projections } = makeStores()

  assert.throws(() => projections.create({ rootPrincipalId: 'agent:missing', spaceId: 'research' }), /root principal not found/i)
  assert.throws(() => projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: '   ' }), /space id is required/i)

  const first = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'research' })
  assert.equal(principals.get(first.principalId)?.type, 'projection')
  assert.throws(() => projections.create({ rootPrincipalId: first.principalId, spaceId: 'nested' }), /nested projections/i)
})

test('projectionAllows supports exact, capability wildcard, and global wildcard scopes', () => {
  const { projections } = makeStores()
  const exact = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'a', permissionScope: ['child:ai-board:LIST_MESSAGES'] })
  assert.equal(projectionAllows(exact, 'child:ai-board', 'LIST_MESSAGES'), true)
  assert.equal(projectionAllows(exact, 'child:ai-board', 'POST_MESSAGE'), false)

  const capabilityWildcard = { ...exact, permissionScope: ['child:ai-board:*'] }
  assert.equal(projectionAllows(capabilityWildcard, 'child:ai-board', 'POST_MESSAGE'), true)
  assert.equal(projectionAllows(capabilityWildcard, 'other', 'POST_MESSAGE'), false)

  const global = { ...exact, permissionScope: ['*:*'] }
  assert.equal(projectionAllows(global, 'anything', 'DO_ANYTHING'), true)
})

test('Projection lifecycle supports suspend, resume, archive, and archived is terminal', () => {
  const { projections } = makeStores()
  const created = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'simulation' })

  const suspended = projections.suspend(created.id)
  assert.equal(suspended.status, 'suspended')
  assert.equal(suspended.suspendedAt, '2026-08-20T02:01:00.000Z')
  assert.equal(projectionAllows(suspended, '*', '*'), false)

  const resumed = projections.resume(created.id)
  assert.equal(resumed.status, 'active')
  assert.equal(resumed.suspendedAt, undefined)

  const archived = projections.archive(created.id)
  assert.equal(archived.status, 'archived')
  assert.equal(archived.archivedAt, '2026-08-20T02:01:00.000Z')
  assert.throws(() => projections.resume(created.id), /archived.*terminal/i)
  assert.throws(() => projections.suspend(created.id), /archived.*terminal/i)
})

test('Projection lifecycle rejects invalid repeated transitions', () => {
  const { projections } = makeStores()
  const created = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'research' })

  assert.throws(() => projections.resume(created.id), /already active/i)
  projections.suspend(created.id)
  assert.throws(() => projections.suspend(created.id), /already suspended/i)
  projections.archive(created.id)
  assert.throws(() => projections.archive(created.id), /already archived/i)
  assert.throws(() => projections.archive('proj:missing'), /projection not found/i)
})

test('Projection checkpoint and merge-candidate records persist without reintegration', () => {
  const { storage, principals, projections } = makeStores()
  const created = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'research' })

  const checkpoint = projections.checkpoint(created.id, '  Learned to compare two proof strategies.  ')
  assert.equal(checkpoint.id, 'checkpoint:1')
  assert.equal(checkpoint.summary, 'Learned to compare two proof strategies.')

  const candidate = projections.createMergeCandidate(created.id, checkpoint.id)
  assert.equal(candidate.id, 'merge:1')
  assert.equal(candidate.status, 'pending')
  assert.equal(candidate.checkpointId, checkpoint.id)

  const reloaded = new ProjectionStore(storage, principals)
  assert.equal(reloaded.checkpoints(created.id)[0]?.id, checkpoint.id)
  assert.equal(reloaded.mergeCandidates(created.id)[0]?.id, candidate.id)
  assert.equal(reloaded.get(created.id)?.status, 'active', 'creating a merge candidate must not reintegrate or archive the projection')
})

test('Projection checkpoint and merge-candidate validate projection and checkpoint lineage', () => {
  const { projections } = makeStores()
  const one = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'one' })
  const two = projections.create({ rootPrincipalId: 'agent:local-demo', spaceId: 'two' })

  assert.throws(() => projections.checkpoint(one.id, '   '), /checkpoint summary is required/i)
  assert.throws(() => projections.checkpoint('proj:missing', 'x'), /projection not found/i)

  const checkpoint = projections.checkpoint(one.id, 'one checkpoint')
  assert.throws(() => projections.createMergeCandidate(two.id, checkpoint.id), /checkpoint does not belong/i)
  assert.throws(() => projections.createMergeCandidate(one.id, 'checkpoint:missing'), /checkpoint not found/i)
})
