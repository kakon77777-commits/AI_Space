import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { exportAiSpaceStateBundle, exportAuthoritativeAiSpaceStateBundle } from '../src/core/statePortability.ts'
import { StateAuthorityStore } from '../src/core/stateAuthority.ts'

async function migrationModule() {
  return import('../src/core/stateMigration.ts')
}

function authorityFromBundle(bundle, updatedAt = bundle.createdAt) {
  return {
    schemaVersion: '1.0',
    lineageId: bundle.authority.lineageId,
    revision: bundle.authority.revision,
    headChecksum: bundle.checksum,
    stateFingerprint: bundle.authority.stateFingerprint,
    updatedAt,
  }
}

function firstCheckpoint(lineageId = 'lineage-A') {
  const source = new MemoryStorageAdapter()
  const bundle = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T11:00:00.000Z',
    lineageIdFactory: () => lineageId,
  })
  return { source, bundle }
}

test('planner classifies legacy and bootstrap candidates', async () => {
  const { planAiSpaceStateMigration } = await migrationModule()
  const legacyStorage = new MemoryStorageAdapter()
  const legacy = exportAiSpaceStateBundle(legacyStorage, { appVersion: '0.1.2', createdAt: '2026-08-20T10:00:00.000Z' })
  const legacyPlan = planAiSpaceStateMigration(legacy, new MemoryStorageAdapter())
  assert.equal(legacyPlan.relation, 'legacy')
  assert.equal(legacyPlan.safeToApply, false)

  const { bundle } = firstCheckpoint()
  const bootstrap = planAiSpaceStateMigration(bundle, new MemoryStorageAdapter())
  assert.equal(bootstrap.relation, 'bootstrap')
  assert.equal(bootstrap.safeToApply, true)
})

test('planner classifies equal and direct fast-forward candidates', async () => {
  const { planAiSpaceStateMigration } = await migrationModule()
  const { source, bundle: rev1 } = firstCheckpoint()
  const target = new MemoryStorageAdapter()
  new StateAuthorityStore(target).set(authorityFromBundle(rev1))

  const equal = planAiSpaceStateMigration(rev1, target)
  assert.equal(equal.relation, 'equal')
  assert.equal(equal.safeToApply, false)

  source.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'post-2' }]))
  const rev2 = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T11:01:00.000Z',
  })
  const fastForward = planAiSpaceStateMigration(rev2, target)
  assert.equal(fastForward.relation, 'fast-forward')
  assert.equal(fastForward.safeToApply, true)
})

test('planner classifies stale, diverged, and foreign candidates', async () => {
  const { planAiSpaceStateMigration } = await migrationModule()
  const { source, bundle: rev1 } = firstCheckpoint('lineage-A')
  source.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'post-2' }]))
  const rev2 = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.1.3',
    createdAt: '2026-08-20T11:01:00.000Z',
  })

  const target = new MemoryStorageAdapter()
  new StateAuthorityStore(target).set(authorityFromBundle(rev2))
  assert.equal(planAiSpaceStateMigration(rev1, target).relation, 'stale')

  const divergedSource = new MemoryStorageAdapter()
  new StateAuthorityStore(divergedSource).set({
    schemaVersion: '1.0', lineageId: 'lineage-A', revision: 1,
    headChecksum: 'deadbeef', stateFingerprint: 'cafebabe', updatedAt: '2026-08-20T11:00:30.000Z',
  })
  const diverged = exportAuthoritativeAiSpaceStateBundle(divergedSource, {
    appVersion: '0.1.3', createdAt: '2026-08-20T11:02:00.000Z',
  })
  const rev1Target = new MemoryStorageAdapter()
  new StateAuthorityStore(rev1Target).set(authorityFromBundle(rev1))
  assert.equal(planAiSpaceStateMigration(diverged, rev1Target).relation, 'diverged')

  const { bundle: foreign } = firstCheckpoint('lineage-B')
  assert.equal(planAiSpaceStateMigration(foreign, rev1Target).relation, 'foreign')
})

test('planner classifies non-empty target without authority as untracked-local', async () => {
  const { planAiSpaceStateMigration } = await migrationModule()
  const { bundle } = firstCheckpoint()
  const target = new MemoryStorageAdapter()
  target.setItem('ai-space.posts.v1', '[]')
  const plan = planAiSpaceStateMigration(bundle, target)
  assert.equal(plan.relation, 'untracked-local')
  assert.equal(plan.safeToApply, false)
})
