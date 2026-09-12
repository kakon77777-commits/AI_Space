import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { ContextSessionStore } from '../src/core/contextSessions.ts'
import { ProjectionStore } from '../src/core/projections.ts'
import { SpaceStore } from '../src/core/spaces.ts'
import { ResourceStore } from '../src/core/resources.ts'
import { BrowserSessionStore } from '../src/core/browserSessions.ts'
import { PostStore } from '../src/core/posts.ts'
import { MvpJourneyRecovery, MvpJourneyRuntime, MvpJourneyStore } from '../src/core/mvpJourneys.ts'

const capabilities = [{ id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready', actions: ['START_BROWSER_SESSION'] }]

function setup(storage = new MemoryStorageAdapter()) {
  let i = 0
  const now = () => `2026-08-20T09:${String(i++).padStart(2, '0')}:00Z`
  const principals = new PrincipalStore(storage, now, () => 'p:1')
  const root = principals.ensureDefault()
  const contexts = new ContextSessionStore(storage, now, () => 'ctx:1')
  const projections = new ProjectionStore(storage, principals, now, () => 'proj:1')
  const spaces = new SpaceStore(storage, principals, now, () => 'space:1', () => 'ref:1')
  spaces.ensureBuiltIns(root.id)
  const resources = new ResourceStore(storage, now, () => 'resource:1')
  const browsers = new BrowserSessionStore(storage, now, () => 'browser:1', () => 'experience:1', () => 'candidate:1')
  const posts = new PostStore(storage, now, () => 'post:1')
  const journeys = new MvpJourneyStore(storage, now, () => 'journey:1')
  const deps = { journeys, principals, contexts, projections, spaces, resources, browsers, posts, capabilities }
  return { storage, root, ...deps, runtime: new MvpJourneyRuntime(deps), recovery: new MvpJourneyRecovery(deps) }
}

function corruptJourney(storage, mutate) {
  const key = 'ai-space.mvp-journeys.v1'
  const rows = JSON.parse(storage.getItem(key))
  rows[0] = mutate(rows[0])
  storage.setItem(key, JSON.stringify(rows))
}

test('MvpJourneyRecovery reconciles missing Experience/Candidate/Post links from authoritative stores', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo', type: 'game', url: 'https://example.com' })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id })
  env.runtime.startInteraction(journey.id)
  env.runtime.completeInteraction(journey.id, 'explicit experience')
  env.runtime.promoteReflection(journey.id, 'Reflection', 'body')

  corruptJourney(env.storage, (row) => {
    const { experienceId, reflectionCandidateId, reflectionPostId, ...rest } = row
    return rest
  })

  const recovered = env.recovery.reconcileReferences(journey.id)
  assert.equal(recovered.experienceId, 'experience:1')
  assert.equal(recovered.reflectionCandidateId, 'candidate:1')
  assert.equal(recovered.reflectionPostId, 'post:1')
})

test('MvpJourneyRecovery resume restores Projection presence and active Principal after reload interruption', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo', type: 'game', url: 'https://example.com' })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id })
  env.spaces.leave(journey.projectionPrincipalId)
  env.principals.setActive(env.root.id)

  const reload = setup(env.storage)
  const resumed = reload.recovery.resume(journey.id)
  assert.equal(resumed.id, journey.id)
  assert.equal(reload.principals.getActive().id, journey.projectionPrincipalId)
  assert.equal(reload.spaces.getActivePresence(journey.projectionPrincipalId)?.spaceId, 'arcade')
  assert.equal(reload.runtime.evaluate(journey.id).coherent, true)
})

test('MvpJourneyRecovery abandonBroken safely terminalizes an interrupted broken Journey', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo', type: 'game', url: 'https://example.com' })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id })
  const { session } = env.runtime.startInteraction(journey.id)
  env.projections.archive(journey.projectionId)

  const abandoned = env.recovery.abandonBroken(journey.id, 'projection archived during interruption')
  assert.equal(abandoned.status, 'abandoned')
  assert.equal(env.browsers.get(session.id)?.status, 'abandoned')
  assert.equal(env.spaces.getActivePresence(journey.projectionPrincipalId), undefined)
  assert.equal(env.principals.getActive().id, env.root.id)
  assert.equal(env.contexts.get(journey.contextSessionId)?.status, 'closed')
})
