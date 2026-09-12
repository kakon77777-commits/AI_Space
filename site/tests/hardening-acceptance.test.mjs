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
import { auditAiSpaceState } from '../src/core/hardening.ts'

const capabilities = [{ id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready', actions: ['START_BROWSER_SESSION'] }]

function stores(storage) {
  const principals = new PrincipalStore(storage)
  const root = principals.ensureDefault()
  const contexts = new ContextSessionStore(storage)
  const projections = new ProjectionStore(storage, principals)
  const spaces = new SpaceStore(storage, principals)
  spaces.ensureBuiltIns(root.id)
  const resources = new ResourceStore(storage)
  const browsers = new BrowserSessionStore(storage)
  const posts = new PostStore(storage)
  const journeys = new MvpJourneyStore(storage)
  const deps = { journeys, principals, contexts, projections, spaces, resources, browsers, posts, capabilities }
  return { root, ...deps, runtime: new MvpJourneyRuntime(deps), recovery: new MvpJourneyRecovery(deps) }
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

test('hardening acceptance repairs derived damage and reloads a coherent active Journey', () => {
  const storage = new MemoryStorageAdapter()
  const env = stores(storage)
  const resource = env.resources.add({ title: 'Audit Game', type: 'game', url: 'https://example.com' })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id })
  env.runtime.startInteraction(journey.id)
  env.runtime.completeInteraction(journey.id, 'explicit experience')
  env.runtime.promoteReflection(journey.id, 'Reflection', 'body')

  const rows = JSON.parse(storage.getItem('ai-space.mvp-journeys.v1'))
  delete rows[0].experienceId
  delete rows[0].reflectionCandidateId
  delete rows[0].reflectionPostId
  storage.setItem('ai-space.mvp-journeys.v1', JSON.stringify(rows))
  storage.setItem('ai-space.space-presences.v1', JSON.stringify([
    { principalId: journey.projectionPrincipalId, spaceId: 'research', enteredAt: 'x' },
    { principalId: 'missing', spaceId: 'arcade', enteredAt: 'x' },
  ]))
  storage.setItem('ai-space.space-resource-refs.v1', JSON.stringify([
    { id: 'bad-ref', spaceId: 'arcade', resourceId: 'missing-resource', addedByPrincipalId: env.root.id, addedAt: 'x' },
  ]))
  env.principals.setActive(env.root.id)

  const damaged = audit(env)
  assert.equal(damaged.errorCount > 0, true)
  assert.equal(damaged.findings.some((item) => item.code === 'projection-presence-space-mismatch'), true)
  assert.equal(damaged.findings.some((item) => item.code === 'space-resource-missing'), true)

  const cleanup = env.spaces.repairDerivedState(env.resources.list(), env.projections.list())
  assert.equal(cleanup.removedPresenceCount, 2)
  assert.equal(cleanup.removedResourceRefCount, 1)
  env.recovery.reconcileReferences(journey.id)
  env.recovery.resume(journey.id)

  const reloaded = stores(storage)
  const report = audit(reloaded)
  assert.equal(report.errorCount, 0)
  assert.equal(reloaded.runtime.evaluate(journey.id).coherent, true)
  assert.equal(reloaded.journeys.get(journey.id)?.reflectionPostId !== undefined, true)
  assert.equal(reloaded.spaces.getActivePresence(journey.projectionPrincipalId)?.spaceId, 'arcade')
})
