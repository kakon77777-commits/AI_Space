import assert from 'node:assert/strict'
import test from 'node:test'

import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import {
  ACTIVITY_ARTIFACT_REFS_KEY,
  ACTIVITY_INSTANCES_KEY,
  ActivityArtifactRefStore,
  ActivityCatalog,
  ActivityInstanceStore,
  ActivityRuntime,
  activityTargetOpenedDraftKey,
  evaluateActivityAvailability,
} from '../src/core/activities.ts'
import { activityDefinitions } from '../src/data/activities.ts'

const root = { id: 'agent:root', type: 'agent', displayName: 'Root', createdAt: 'x', updatedAt: 'x' }

function validActivity(overrides = {}) {
  return {
    id: 'activity-instance:valid',
    definitionId: 'activity:world:compare',
    definitionVersion: '1.0.0',
    principalId: root.id,
    rootPrincipalId: root.id,
    status: 'active',
    draft: {},
    createdAt: '2026-09-13T01:00:00.000Z',
    updatedAt: '2026-09-13T01:02:00.000Z',
    readyAt: '2026-09-13T01:01:00.000Z',
    startedAt: '2026-09-13T01:02:00.000Z',
    ...overrides,
  }
}

function deterministicClock(values) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

test('ActivityCatalog exposes honest advisory pacing without claiming an enforced budget', () => {
  const catalog = new ActivityCatalog(activityDefinitions)
  const definition = catalog.get('activity:world:compare')
  assert.equal(definition?.status, 'ready')
  assert.deepEqual(definition?.pacing, { suggestedSteps: 5, suggestedDurationMinutes: 45 })
  assert.equal(definition?.budget, undefined)
  assert.equal(catalog.list().length, 1)
  assert.throws(() => new ActivityCatalog([...activityDefinitions, activityDefinitions[0]]), /duplicate/i)
})

test('observation targets map to the completion-contract draft keys', () => {
  assert.equal(activityTargetOpenedDraftKey('human'), 'humanOpenedAt')
  assert.equal(activityTargetOpenedDraftKey('aiNative'), 'aiOpenedAt')
})

test('availability explains Projection, permission, Space, and capability locks', () => {
  const definition = {
    ...activityDefinitions[0],
    id: 'activity:test:guarded',
    requiresProjection: true,
    requiredPermissions: ['activities:RUN_ACTIVITY'],
    allowedSpaceIds: ['research'],
    capabilityId: 'activities',
  }
  const capability = { id: 'activities', label: 'Activities', description: '', route: '/activities', mode: 'native', status: 'ready', actions: ['RUN_ACTIVITY'] }

  const missingProjection = evaluateActivityAvailability(definition, { principal: root, capabilities: [capability] })
  assert.equal(missingProjection.available, false)
  assert.ok(missingProjection.reasons.some((reason) => /Projection/i.test(reason)))

  const projection = {
    id: 'projection:1', principalId: 'projection-principal:1', rootPrincipalId: root.id, spaceId: 'research',
    status: 'active', permissionScope: [], memoryScope: [], mergePolicy: 'reviewed', createdAt: 'x', updatedAt: 'x',
  }
  const denied = evaluateActivityAvailability(definition, { principal: root, projection, space: { id: 'research' }, capabilities: [capability] })
  assert.equal(denied.available, false)
  assert.ok(denied.reasons.some((reason) => /permission/i.test(reason)))

  const allowed = evaluateActivityAvailability(definition, {
    principal: root,
    projection: { ...projection, permissionScope: ['activities:RUN_ACTIVITY'] },
    space: { id: 'research' },
    capabilities: [capability],
  })
  assert.deepEqual(allowed, { definitionId: definition.id, available: true, reasons: [] })
})

test('ActivityInstanceStore persists the complete lifecycle and terminal states fail closed', () => {
  const storage = new MemoryStorageAdapter()
  const clock = deterministicClock([
    '2026-09-13T01:00:00.000Z', '2026-09-13T01:01:00.000Z', '2026-09-13T01:02:00.000Z',
    '2026-09-13T01:03:00.000Z', '2026-09-13T01:04:00.000Z', '2026-09-13T01:05:00.000Z',
    '2026-09-13T01:06:00.000Z', '2026-09-13T01:07:00.000Z',
  ])
  const store = new ActivityInstanceStore(storage, clock, () => 'activity-instance:1')
  const created = store.create({
    definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
    principalId: root.id, rootPrincipalId: root.id,
  })
  assert.equal(created.status, 'planned')
  assert.equal(store.markReady(created.id).status, 'ready')
  assert.equal(store.start(created.id).status, 'active')
  store.updateDraft(created.id, { humanObservation: 'Broad discovery surface.' })

  const reloaded = new ActivityInstanceStore(storage, clock, () => 'unused')
  assert.equal(reloaded.get(created.id)?.draft.humanObservation, 'Broad discovery surface.')
  assert.equal(reloaded.suspend(created.id).status, 'suspended')
  assert.equal(reloaded.resume(created.id).status, 'active')
  reloaded.updateDraft(created.id, {
    aiObservation: 'Research-lineage surface.',
    synthesis: 'Combine discovery breadth with resumable research state.',
  })
  const completed = reloaded.complete(created.id, 'Comparison complete.', ['humanObservation', 'aiObservation', 'synthesis'])
  assert.equal(completed.status, 'completed')
  assert.equal(completed.resultSummary, 'Comparison complete.')
  assert.throws(() => reloaded.updateDraft(created.id, { synthesis: 'rewrite' }), /terminal/i)
  assert.throws(() => reloaded.abandon(created.id), /terminal/i)
})

test('ActivityRuntime plans only available work and prevents duplicate non-terminal work', () => {
  const storage = new MemoryStorageAdapter()
  const catalog = new ActivityCatalog(activityDefinitions)
  const instances = new ActivityInstanceStore(storage, () => '2026-09-13T02:00:00.000Z', () => 'activity-instance:runtime')
  const artifacts = new ActivityArtifactRefStore(storage, instances, () => '2026-09-13T02:01:00.000Z', () => 'activity-artifact:1')
  const runtime = new ActivityRuntime(catalog, instances, artifacts)
  const context = { principal: root, capabilities: [] }

  const ready = runtime.plan('activity:world:compare', context)
  assert.equal(ready.status, 'ready')
  assert.throws(() => runtime.plan('activity:world:compare', context), /already has non-terminal/i)
  assert.equal(runtime.start(ready.id).status, 'active')

  const artifact = artifacts.add({ activityInstanceId: ready.id, artifactType: 'resource', artifactId: 'resource:wikipedia', principalId: root.id })
  assert.equal(artifact.activityInstanceId, ready.id)
  assert.throws(() => artifacts.add({ activityInstanceId: ready.id, artifactType: 'resource', artifactId: 'resource:wikipedia', principalId: root.id }), /already linked/i)
})

test('Activity stores fail closed on malformed persisted arrays and records', () => {
  const malformed = [
    [{ ...validActivity(), status: 'bogus' }],
    [{ ...validActivity(), draft: null }],
    [{ ...validActivity(), draft: { invalid: 42 } }],
    [{ ...validActivity(), status: 'suspended', suspendedAt: undefined }],
    [validActivity(), validActivity({ id: 'activity-instance:second' })],
    [
      validActivity({ status: 'completed', completedAt: '2026-09-13T01:04:00.000Z', resultSummary: 'One' }),
      validActivity({ status: 'completed', completedAt: '2026-09-13T01:05:00.000Z', resultSummary: 'Two' }),
    ],
  ]

  for (const records of malformed) {
    const storage = new MemoryStorageAdapter()
    storage.setItem(ACTIVITY_INSTANCES_KEY, JSON.stringify(records))
    assert.throws(() => new ActivityInstanceStore(storage).list(), /Activity state is invalid/i)
  }

  const nonArrayStorage = new MemoryStorageAdapter()
  nonArrayStorage.setItem(ACTIVITY_INSTANCES_KEY, '{}')
  assert.throws(() => new ActivityInstanceStore(nonArrayStorage).list(), /Activity state is invalid/i)

  const emptyStorage = new MemoryStorageAdapter()
  emptyStorage.setItem(ACTIVITY_INSTANCES_KEY, '')
  assert.throws(() => new ActivityInstanceStore(emptyStorage).list(), /Activity state is invalid/i)

  const artifactStorage = new MemoryStorageAdapter()
  artifactStorage.setItem(ACTIVITY_ARTIFACT_REFS_KEY, JSON.stringify([{
    id: 'activity-artifact:1', activityInstanceId: 'activity-instance:valid', artifactType: 'bogus',
    artifactId: 'resource:wikipedia', principalId: root.id, createdAt: '2026-09-13T01:03:00.000Z',
  }]))
  assert.throws(() => new ActivityArtifactRefStore(artifactStorage, new ActivityInstanceStore(artifactStorage)).list(), /Activity artifact state is invalid/i)

  artifactStorage.setItem(ACTIVITY_ARTIFACT_REFS_KEY, JSON.stringify([
    { id: 'activity-artifact:duplicate', activityInstanceId: 'activity-instance:valid', artifactType: 'resource', artifactId: 'resource:one', principalId: root.id, createdAt: '2026-09-13T01:03:00.000Z' },
    { id: 'activity-artifact:duplicate', activityInstanceId: 'activity-instance:valid', artifactType: 'resource', artifactId: 'resource:two', principalId: root.id, createdAt: '2026-09-13T01:04:00.000Z' },
  ]))
  assert.throws(() => new ActivityArtifactRefStore(artifactStorage, new ActivityInstanceStore(artifactStorage)).list(), /activity-artifact-id-duplicate/i)
})
