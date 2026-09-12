import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { exportAiSpaceStateBundle, exportAuthoritativeAiSpaceStateBundle } from '../src/core/statePortability.ts'
import { STATE_AUTHORITY_KEY, StateAuthorityStore } from '../src/core/stateAuthority.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { planAiSpaceStateMigration } from '../src/core/stateMigration.ts'
import * as migration from '../src/core/stateMigration.ts'

const CAPABILITIES = []

class CountingStorage extends MemoryStorageAdapter {
  writes = 0
  setItem(key, value) { this.writes++; super.setItem(key, value) }
  removeItem(key) { this.writes++; super.removeItem(key) }
}

class FailOnceAuthorityStorage extends MemoryStorageAdapter {
  failed = false
  setItem(key, value) {
    if (key === STATE_AUTHORITY_KEY && !this.failed) {
      this.failed = true
      throw new Error('authority write failed')
    }
    super.setItem(key, value)
  }
}

function createRev1(lineageId = 'lineage-A') {
  const source = new MemoryStorageAdapter()
  new PrincipalStore(source, () => '2026-08-20T12:00:00.000Z').ensureDefault()
  source.setItem('ai-space.posts.v1', '[]')
  const rev1 = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.1.3', createdAt: '2026-08-20T12:00:00.000Z', lineageIdFactory: () => lineageId,
  })
  return { source, rev1 }
}

test('safe migration apply accepts bootstrap and persists candidate authority', () => {
  assert.equal(typeof migration.applyPlannedAiSpaceStateMigration, 'function')
  const { rev1 } = createRev1()
  const target = new MemoryStorageAdapter()
  const result = migration.applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: CAPABILITIES })
  assert.equal(result.plan.relation, 'bootstrap')
  assert.equal(target.getItem('ai-space.posts.v1'), '[]')
  const authority = new StateAuthorityStore(target).get()
  assert.equal(authority.headChecksum, rev1.checksum)
  assert.equal(authority.revision, 1)
})

test('safe migration apply accepts only a direct fast-forward', () => {
  const { source, rev1 } = createRev1()
  const target = new MemoryStorageAdapter()
  migration.applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: CAPABILITIES })

  source.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'post-2' }]))
  const rev2 = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.1.3', createdAt: '2026-08-20T12:01:00.000Z',
  })
  assert.equal(planAiSpaceStateMigration(rev2, target).relation, 'fast-forward')
  const result = migration.applyPlannedAiSpaceStateMigration(rev2, target, { capabilities: CAPABILITIES })
  assert.equal(result.plan.relation, 'fast-forward')
  assert.equal(new StateAuthorityStore(target).get().headChecksum, rev2.checksum)
})

test('rejected migration relations perform zero target writes', () => {
  const { rev1 } = createRev1('lineage-A')
  const target = new CountingStorage()
  target.setItem('ai-space.posts.v1', '[]')
  target.writes = 0
  assert.equal(planAiSpaceStateMigration(rev1, target).relation, 'untracked-local')
  assert.throws(() => migration.applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: CAPABILITIES }), /not safe to apply/i)
  assert.equal(target.writes, 0)

  const legacy = exportAiSpaceStateBundle(new MemoryStorageAdapter(), { appVersion: '0.1.2', createdAt: '2026-08-20T10:00:00.000Z' })
  assert.throws(() => migration.applyPlannedAiSpaceStateMigration(legacy, target, { capabilities: CAPABILITIES }), /not safe to apply/i)
  assert.equal(target.writes, 0)
})

test('authority commit failure rolls back restored domain state and authority metadata', () => {
  const { rev1 } = createRev1()
  const target = new FailOnceAuthorityStorage()
  target.setItem('unrelated-key', 'keep')
  assert.throws(() => migration.applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: CAPABILITIES }), /authority write failed/)
  assert.equal(target.getItem('ai-space.posts.v1'), null)
  assert.equal(target.getItem(STATE_AUTHORITY_KEY), null)
  assert.equal(target.getItem('unrelated-key'), 'keep')
})

test('explicit authority-aware replace adopts v1.1 candidate lineage even when foreign', () => {
  assert.equal(typeof migration.replaceAiSpaceStateBundleWithAuthority, 'function')
  const { rev1: localRev } = createRev1('lineage-local')
  const target = new MemoryStorageAdapter()
  migration.applyPlannedAiSpaceStateMigration(localRev, target, { capabilities: CAPABILITIES })

  const foreignSource = new MemoryStorageAdapter()
  new PrincipalStore(foreignSource, () => '2026-08-20T12:10:00.000Z').ensureDefault()
  foreignSource.setItem('ai-space.posts.v1', JSON.stringify([{ id: 'foreign-post' }]))
  const foreign = exportAuthoritativeAiSpaceStateBundle(foreignSource, {
    appVersion: '0.1.3', createdAt: '2026-08-20T12:10:00.000Z', lineageIdFactory: () => 'lineage-foreign',
  })
  assert.equal(planAiSpaceStateMigration(foreign, target).relation, 'foreign')

  migration.replaceAiSpaceStateBundleWithAuthority(foreign, target, { capabilities: CAPABILITIES })
  assert.equal(new StateAuthorityStore(target).get().lineageId, 'lineage-foreign')
  assert.equal(target.getItem('ai-space.posts.v1'), JSON.stringify([{ id: 'foreign-post' }]))
})

test('explicit authority-aware replace of legacy v1.0 bundle clears old authority', () => {
  const { rev1 } = createRev1('lineage-local')
  const target = new MemoryStorageAdapter()
  migration.applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: CAPABILITIES })
  assert.ok(new StateAuthorityStore(target).get())

  const legacySource = new MemoryStorageAdapter()
  new PrincipalStore(legacySource, () => '2026-08-20T12:11:00.000Z').ensureDefault()
  const legacy = exportAiSpaceStateBundle(legacySource, { appVersion: '0.1.2', createdAt: '2026-08-20T12:11:00.000Z' })
  migration.replaceAiSpaceStateBundleWithAuthority(legacy, target, { capabilities: CAPABILITIES })
  assert.equal(new StateAuthorityStore(target).get(), null)
})
