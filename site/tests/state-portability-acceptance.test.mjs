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
import { MvpJourneyRuntime, MvpJourneyStore } from '../src/core/mvpJourneys.ts'
import { auditAiSpaceState } from '../src/core/hardening.ts'
import { exportAiSpaceStateBundle, restoreAiSpaceStateBundle } from '../src/core/statePortability.ts'

const capabilities = [{
  id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready',
  actions: ['START_BROWSER_SESSION', 'COMPLETE_BROWSER_SESSION', 'PROMOTE_EXPERIENCE_REFLECTION'],
}]

function setup(storage = new MemoryStorageAdapter()) {
  let seq = 0
  const now = () => `2026-08-20T06:${String(seq++).padStart(2, '0')}:00.000Z`
  const principals = new PrincipalStore(storage, now, () => `principal:${seq}`)
  const root = principals.ensureDefault()
  const contexts = new ContextSessionStore(storage, now, () => `ctx:${seq}`)
  const projections = new ProjectionStore(storage, principals, now, () => `proj:${seq}`, () => `checkpoint:${seq}`, () => `merge:${seq}`)
  const spaces = new SpaceStore(storage, principals, now, () => `space:${seq}`, () => `ref:${seq}`)
  spaces.ensureBuiltIns(root.id)
  const resources = new ResourceStore(storage, now, () => `resource:${seq}`)
  const browsers = new BrowserSessionStore(storage, now, () => `browser:${seq}`, () => `experience:${seq}`, () => `candidate:${seq}`)
  const posts = new PostStore(storage, now, () => `post:${seq}`)
  const journeys = new MvpJourneyStore(storage, now, () => `journey:${seq}`)
  const runtime = new MvpJourneyRuntime({ journeys, principals, contexts, projections, spaces, resources, browsers, posts, capabilities })
  return { storage, root, principals, contexts, projections, spaces, resources, browsers, posts, journeys, runtime }
}

function audit(env) {
  return auditAiSpaceState({
    principals: env.principals.list(), contextSessions: env.contexts.list(), projections: env.projections.list(),
    spaces: env.spaces.list(), memberships: env.spaces.allMemberships(), presences: env.spaces.presences(),
    resourceRefs: env.spaces.resourceRefs(), capabilities, resources: env.resources.list(), browserSessions: env.browsers.sessions(),
    experiences: env.browsers.experiences(), reflectionCandidates: env.browsers.reflectionCandidates(), posts: env.posts.list(),
    journeys: env.journeys.list(), activePrincipalId: env.principals.getActive().id,
  })
}

test('state bundle round-trip preserves a completed coherent MVP Journey across fresh storage and store recreation', () => {
  const source = setup()
  const resource = source.resources.add({ title: 'Portable Game', type: 'game', url: 'https://example.com/play' })
  const { journey } = source.runtime.begin({ rootPrincipalId: source.root.id, spaceId: 'arcade', resourceId: resource.id, label: 'Portable MVP' })
  source.runtime.startInteraction(journey.id)
  source.runtime.completeInteraction(journey.id, 'Portable explicit experience')
  source.runtime.promoteReflection(journey.id, 'Portable reflection', 'Persisted reflection body')
  source.runtime.finish(journey.id)
  assert.equal(source.runtime.evaluate(journey.id).complete, true)
  assert.equal(audit(source).errorCount, 0)

  const bundle = exportAiSpaceStateBundle(source.storage, { appVersion: '0.1.2', createdAt: '2026-08-20T07:00:00.000Z' })
  const restoredStorage = new MemoryStorageAdapter()
  restoredStorage.setItem('unrelated.keep', 'yes')
  const result = restoreAiSpaceStateBundle(bundle, restoredStorage, { capabilities })
  assert.equal(result.audit.errorCount, 0)
  assert.equal(restoredStorage.getItem('unrelated.keep'), 'yes')

  const restored = setup(restoredStorage)
  const evaluation = restored.runtime.evaluate(journey.id)
  assert.equal(evaluation.complete, true)
  assert.equal(evaluation.coherent, true)
  assert.deepEqual(evaluation.stages.map((stage) => stage.status), Array(9).fill('pass'))
  assert.equal(audit(restored).errorCount, 0)
})
