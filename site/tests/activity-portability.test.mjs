import assert from 'node:assert/strict'
import test from 'node:test'

import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import {
  AI_SPACE_STATE_KEYS,
  exportAiSpaceStateBundle,
  exportAuthoritativeAiSpaceStateBundle,
  restoreAiSpaceStateBundle,
  validateAiSpaceStateBundle,
} from '../src/core/statePortability.ts'
import { applyPlannedAiSpaceStateMigration, planAiSpaceStateMigration } from '../src/core/stateMigration.ts'
import { activityDefinitions } from '../src/data/activities.ts'
import { ActivityInstanceStore } from '../src/core/activities.ts'

const ACTIVITY_KEY = 'ai-space.activity-instances.v1'
const ARTIFACT_KEY = 'ai-space.activity-artifact-refs.v1'

function seedRoot(storage) {
  return new PrincipalStore(storage, () => '2026-09-13T03:00:00.000Z').ensureDefault()
}

test('authoritative schema 1.2 includes Activity state while legacy 1.0 stays readable', () => {
  const storage = new MemoryStorageAdapter()
  seedRoot(storage)
  storage.setItem(ACTIVITY_KEY, JSON.stringify([{ id: 'activity-instance:1' }]))
  storage.setItem(ARTIFACT_KEY, '[]')
  const current = exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.2.1', createdAt: '2026-09-13T03:01:00.000Z', lineageIdFactory: () => 'lineage-activity',
  })
  assert.equal(current.schemaVersion, '1.2')
  assert.ok(AI_SPACE_STATE_KEYS.includes(ACTIVITY_KEY))
  assert.equal(current.entries[ACTIVITY_KEY], JSON.stringify([{ id: 'activity-instance:1' }]))
  assert.equal(validateAiSpaceStateBundle(current).schemaVersion, '1.2')

  const legacy = exportAiSpaceStateBundle(storage, { appVersion: '0.1.3', createdAt: '2026-09-13T03:02:00.000Z' })
  assert.equal(legacy.schemaVersion, '1.0')
  assert.equal(validateAiSpaceStateBundle(legacy).schemaVersion, '1.0')
})

test('restoring an old bundle clears unsupported newer Activity state instead of retaining stale data', () => {
  const legacySource = new MemoryStorageAdapter()
  seedRoot(legacySource)
  const legacy = exportAiSpaceStateBundle(legacySource, { appVersion: '0.1.3', createdAt: '2026-09-13T03:03:00.000Z' })

  const target = new MemoryStorageAdapter()
  seedRoot(target)
  target.setItem(ACTIVITY_KEY, JSON.stringify([{ id: 'stale' }]))
  target.setItem(ARTIFACT_KEY, JSON.stringify([{ id: 'stale-artifact' }]))
  restoreAiSpaceStateBundle(legacy, target, { capabilities: [], activityDefinitions })
  assert.equal(target.getItem(ACTIVITY_KEY), null)
  assert.equal(target.getItem(ARTIFACT_KEY), null)
})

test('Activity state participates in direct authoritative fast-forward migration', () => {
  const source = new MemoryStorageAdapter()
  const root = seedRoot(source)
  let timestampIndex = 0
  const timestamps = ['2026-09-13T03:03:10.000Z', '2026-09-13T03:03:20.000Z', '2026-09-13T03:03:30.000Z', '2026-09-13T03:04:30.000Z']
  const instances = new ActivityInstanceStore(source, () => timestamps[Math.min(timestampIndex++, timestamps.length - 1)], () => 'activity-instance:rev1')
  const created = instances.create({
    definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
    principalId: root.id, rootPrincipalId: root.id,
  })
  instances.markReady(created.id)
  instances.start(created.id)
  const rev1 = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.2.1', createdAt: '2026-09-13T03:04:00.000Z', lineageIdFactory: () => 'lineage-activity',
  })
  const target = new MemoryStorageAdapter()
  applyPlannedAiSpaceStateMigration(rev1, target, { capabilities: [], activityDefinitions })

  instances.updateDraft(created.id, { synthesis: 'rev2 research state' })
  const rev2 = exportAuthoritativeAiSpaceStateBundle(source, { appVersion: '0.2.1', createdAt: '2026-09-13T03:05:00.000Z' })
  assert.equal(planAiSpaceStateMigration(rev2, target).relation, 'fast-forward')
  applyPlannedAiSpaceStateMigration(rev2, target, { capabilities: [], activityDefinitions })
  assert.match(target.getItem(ACTIVITY_KEY), /rev2 research state/)
})

test('valid-checksum schema 1.2 bundles fail closed on malformed Activity state', () => {
  const cases = [
    [{
      id: 'activity-instance:bogus', definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
      principalId: 'agent:local-demo', rootPrincipalId: 'agent:local-demo', status: 'bogus', draft: {},
      createdAt: '2026-09-13T04:00:00.000Z', updatedAt: '2026-09-13T04:00:00.000Z',
    }],
    [{
      id: 'activity-instance:null-draft', definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
      principalId: 'agent:local-demo', rootPrincipalId: 'agent:local-demo', status: 'active', draft: null,
      createdAt: '2026-09-13T04:00:00.000Z', updatedAt: '2026-09-13T04:02:00.000Z',
      readyAt: '2026-09-13T04:01:00.000Z', startedAt: '2026-09-13T04:02:00.000Z',
    }],
    [{
      id: 'activity-instance:suspended', definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
      principalId: 'agent:local-demo', rootPrincipalId: 'agent:local-demo', status: 'suspended', draft: {},
      createdAt: '2026-09-13T04:00:00.000Z', updatedAt: '2026-09-13T04:03:00.000Z', readyAt: '2026-09-13T04:01:00.000Z',
    }],
  ]

  for (const records of cases) {
    const source = new MemoryStorageAdapter()
    seedRoot(source)
    source.setItem(ACTIVITY_KEY, JSON.stringify(records))
    source.setItem(ARTIFACT_KEY, '[]')
    const bundle = exportAuthoritativeAiSpaceStateBundle(source, {
      appVersion: '0.2.1', createdAt: '2026-09-13T04:10:00.000Z', lineageIdFactory: () => 'lineage-malformed',
    })
    assert.throws(
      () => restoreAiSpaceStateBundle(bundle, new MemoryStorageAdapter(), { capabilities: [], activityDefinitions }),
      /Staged state audit failed: activity-instance-/i,
    )
  }
})

test('valid-checksum schema 1.2 bundles reject duplicate non-terminal Activity work', () => {
  const source = new MemoryStorageAdapter()
  const root = seedRoot(source)
  const base = {
    definitionId: 'activity:world:compare', definitionVersion: '1.0.0', principalId: root.id, rootPrincipalId: root.id,
    status: 'active', draft: {}, createdAt: '2026-09-13T04:00:00.000Z', updatedAt: '2026-09-13T04:02:00.000Z',
    readyAt: '2026-09-13T04:01:00.000Z', startedAt: '2026-09-13T04:02:00.000Z',
  }
  source.setItem(ACTIVITY_KEY, JSON.stringify([{ ...base, id: 'activity-instance:one' }, { ...base, id: 'activity-instance:two' }]))
  source.setItem(ARTIFACT_KEY, '[]')
  const bundle = exportAuthoritativeAiSpaceStateBundle(source, {
    appVersion: '0.2.1', createdAt: '2026-09-13T04:10:00.000Z', lineageIdFactory: () => 'lineage-duplicate',
  })
  assert.throws(
    () => restoreAiSpaceStateBundle(bundle, new MemoryStorageAdapter(), { capabilities: [], activityDefinitions }),
    /activity-instance-non-terminal-duplicate/i,
  )
})
