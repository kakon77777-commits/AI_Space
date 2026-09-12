import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { MvpJourneyStore } from '../src/core/mvpJourneys.ts'

function makeStore(storage = new MemoryStorageAdapter()) {
  let id = 0
  let tick = 0
  return new MvpJourneyStore(
    storage,
    () => `2026-08-20T04:0${tick++}:00.000Z`,
    () => `journey:${++id}`,
  )
}

test('MvpJourneyStore creates and reloads an active cross-store reference record', () => {
  const storage = new MemoryStorageAdapter()
  const store = makeStore(storage)
  const created = store.create({
    label: '  Coherent demo  ',
    rootPrincipalId: 'agent:root',
    contextSessionId: 'ctx:1',
    projectionId: 'proj:1',
    projectionPrincipalId: 'projection:1',
    spaceId: 'arcade',
    capabilityId: 'arcade',
    resourceId: 'resource:1',
  })

  assert.equal(created.id, 'journey:1')
  assert.equal(created.label, 'Coherent demo')
  assert.equal(created.status, 'active')
  assert.equal(created.startedAt, '2026-08-20T04:00:00.000Z')
  assert.equal(created.updatedAt, created.startedAt)

  const reloaded = new MvpJourneyStore(storage)
  assert.deepEqual(reloaded.get(created.id), created)
  assert.deepEqual(reloaded.list().map((item) => item.id), [created.id])
})

test('MvpJourneyStore links interaction, experience, and reflection references while active', () => {
  const store = makeStore()
  const journey = store.create({
    label: 'Demo', rootPrincipalId: 'agent:root', contextSessionId: 'ctx:1', projectionId: 'proj:1',
    projectionPrincipalId: 'projection:1', spaceId: 'arcade', capabilityId: 'arcade', resourceId: 'resource:1',
  })

  assert.equal(store.linkInteraction(journey.id, 'browser:1').browserSessionId, 'browser:1')
  const withExperience = store.linkExperience(journey.id, 'experience:1', 'candidate:1')
  assert.equal(withExperience.experienceId, 'experience:1')
  assert.equal(withExperience.reflectionCandidateId, 'candidate:1')
  assert.equal(store.linkReflection(journey.id, 'post:1').reflectionPostId, 'post:1')
})

test('MvpJourneyStore completion requires the full interaction/reflection reference set and is terminal', () => {
  const store = makeStore()
  const journey = store.create({
    label: 'Demo', rootPrincipalId: 'agent:root', contextSessionId: 'ctx:1', projectionId: 'proj:1',
    projectionPrincipalId: 'projection:1', spaceId: 'arcade', capabilityId: 'arcade', resourceId: 'resource:1',
  })

  assert.throws(() => store.complete(journey.id), /interaction.*experience.*reflection/i)
  store.linkInteraction(journey.id, 'browser:1')
  store.linkExperience(journey.id, 'experience:1', 'candidate:1')
  store.linkReflection(journey.id, 'post:1')
  const completed = store.complete(journey.id)
  assert.equal(completed.status, 'completed')
  assert.ok(completed.completedAt)
  assert.throws(() => store.linkInteraction(journey.id, 'browser:2'), /terminal/i)
  assert.throws(() => store.abandon(journey.id, 'nope'), /terminal/i)
})

test('MvpJourneyStore abandon is terminal and records an explicit reason', () => {
  const store = makeStore()
  const journey = store.create({
    label: 'Demo', rootPrincipalId: 'agent:root', contextSessionId: 'ctx:1', projectionId: 'proj:1',
    projectionPrincipalId: 'projection:1', spaceId: 'arcade', capabilityId: 'arcade', resourceId: 'resource:1',
  })
  const abandoned = store.abandon(journey.id, '  popup blocked  ')
  assert.equal(abandoned.status, 'abandoned')
  assert.equal(abandoned.abandonReason, 'popup blocked')
  assert.ok(abandoned.abandonedAt)
  assert.throws(() => store.complete(journey.id), /terminal/i)
})
