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
import { exportAuthoritativeAiSpaceStateBundle } from '../src/core/statePortability.ts'
import { applyPlannedAiSpaceStateMigration, planAiSpaceStateMigration } from '../src/core/stateMigration.ts'

const capabilities = [{
  id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready',
  actions: ['START_BROWSER_SESSION', 'COMPLETE_BROWSER_SESSION', 'PROMOTE_EXPERIENCE_REFLECTION'],
}]

function setup(storage = new MemoryStorageAdapter(), prefix = 'a') {
  let seq = 0
  const now = () => `2026-08-20T13:${String(seq++).padStart(2, '0')}:00.000Z`
  const principals = new PrincipalStore(storage, now, () => `${prefix}:principal:${seq}`)
  const root = principals.ensureDefault()
  const contexts = new ContextSessionStore(storage, now, () => `${prefix}:ctx:${seq}`)
  const projections = new ProjectionStore(storage, principals, now, () => `${prefix}:proj:${seq}`, () => `${prefix}:checkpoint:${seq}`, () => `${prefix}:merge:${seq}`)
  const spaces = new SpaceStore(storage, principals, now, () => `${prefix}:space:${seq}`, () => `${prefix}:ref:${seq}`)
  spaces.ensureBuiltIns(root.id)
  const resources = new ResourceStore(storage, now, () => `${prefix}:resource:${seq}`)
  const browsers = new BrowserSessionStore(storage, now, () => `${prefix}:browser:${seq}`, () => `${prefix}:experience:${seq}`, () => `${prefix}:candidate:${seq}`)
  const posts = new PostStore(storage, now, () => `${prefix}:post:${seq}`)
  const journeys = new MvpJourneyStore(storage, now, () => `${prefix}:journey:${seq}`)
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

function completeJourney(env, title, label) {
  const resource = env.resources.add({ title, type: 'game', url: `https://example.com/${encodeURIComponent(label)}` })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id, label })
  env.runtime.startInteraction(journey.id)
  env.runtime.completeInteraction(journey.id, `${label} experience`)
  env.runtime.promoteReflection(journey.id, `${label} reflection`, `${label} reflection body`)
  env.runtime.finish(journey.id)
  return journey.id
}

test('authoritative state migrates A rev1 -> B bootstrap -> A rev2 -> B fast-forward and remains coherent after fresh reload', () => {
  const a = setup(new MemoryStorageAdapter(), 'a')
  const journey1 = completeJourney(a, 'Migration Game 1', 'rev1')
  assert.equal(a.runtime.evaluate(journey1).complete, true)
  assert.equal(audit(a).errorCount, 0)

  const rev1 = exportAuthoritativeAiSpaceStateBundle(a.storage, {
    appVersion: '0.1.3', createdAt: '2026-08-20T14:00:00.000Z', lineageIdFactory: () => 'lineage-migration',
  })

  const bStorage = new MemoryStorageAdapter()
  assert.equal(planAiSpaceStateMigration(rev1, bStorage).relation, 'bootstrap')
  applyPlannedAiSpaceStateMigration(rev1, bStorage, { capabilities })
  const b1 = setup(bStorage, 'b')
  assert.equal(b1.runtime.evaluate(journey1).complete, true)
  assert.equal(b1.runtime.evaluate(journey1).coherent, true)
  assert.equal(audit(b1).errorCount, 0)

  const journey2 = completeJourney(a, 'Migration Game 2', 'rev2')
  const rev2 = exportAuthoritativeAiSpaceStateBundle(a.storage, {
    appVersion: '0.1.3', createdAt: '2026-08-20T14:01:00.000Z',
  })
  assert.equal(rev2.authority.revision, 2)
  assert.equal(rev2.authority.parentChecksum, rev1.checksum)
  assert.equal(planAiSpaceStateMigration(rev2, bStorage).relation, 'fast-forward')
  applyPlannedAiSpaceStateMigration(rev2, bStorage, { capabilities })

  const b2 = setup(bStorage, 'b-reloaded')
  for (const journeyId of [journey1, journey2]) {
    const evaluation = b2.runtime.evaluate(journeyId)
    assert.equal(evaluation.complete, true)
    assert.equal(evaluation.coherent, true)
    assert.deepEqual(evaluation.stages.map((stage) => stage.status), Array(9).fill('pass'))
  }
  assert.equal(audit(b2).errorCount, 0)
})
