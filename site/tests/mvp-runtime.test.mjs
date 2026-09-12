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

const capabilities = [{
  id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready',
  actions: ['START_BROWSER_SESSION', 'COMPLETE_BROWSER_SESSION', 'PROMOTE_EXPERIENCE_REFLECTION'],
}]

function setup(storage = new MemoryStorageAdapter()) {
  let principalId = 0
  let projectionId = 0
  let contextId = 0
  let resourceId = 0
  let browserId = 0
  let experienceId = 0
  let candidateId = 0
  let postId = 0
  let journeyId = 0
  let tick = 0
  const now = () => `2026-08-20T05:${String(tick++).padStart(2, '0')}:00.000Z`
  const principals = new PrincipalStore(storage, now, () => `p-${++principalId}`)
  const root = principals.ensureDefault()
  const contexts = new ContextSessionStore(storage, now, () => `ctx:${++contextId}`)
  const projections = new ProjectionStore(storage, principals, now, () => `proj:${++projectionId}`, () => 'checkpoint:1', () => 'merge:1')
  const spaces = new SpaceStore(storage, principals, now, () => 'space:custom', () => 'ref:1')
  spaces.ensureBuiltIns(root.id)
  const resources = new ResourceStore(storage, now, () => `resource:${++resourceId}`)
  const browsers = new BrowserSessionStore(storage, now, () => `browser:${++browserId}`, () => `experience:${++experienceId}`, () => `candidate:${++candidateId}`)
  const posts = new PostStore(storage, now, () => `post:${++postId}`)
  const journeys = new MvpJourneyStore(storage, now, () => `journey:${++journeyId}`)
  const runtime = new MvpJourneyRuntime({ journeys, principals, contexts, projections, spaces, resources, browsers, posts, capabilities })
  return { storage, root, principals, contexts, projections, spaces, resources, browsers, posts, journeys, runtime }
}

test('MvpJourneyRuntime completes the coherent Principal -> Context -> Projection -> Space -> Experience -> Reflection -> Return path', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo Game', type: 'game', url: 'https://example.com/play' })

  const begun = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id, label: 'Coherent MVP' })
  assert.equal(begun.journey.status, 'active')
  assert.equal(env.contexts.get(begun.journey.contextSessionId)?.status, 'active')
  assert.equal(env.projections.get(begun.journey.projectionId)?.permissionScope.includes('arcade:START_BROWSER_SESSION'), true)
  assert.equal(env.spaces.getActivePresence(begun.journey.projectionPrincipalId)?.spaceId, 'arcade')
  assert.equal(env.principals.getActive().id, begun.journey.projectionPrincipalId)

  const interaction = env.runtime.startInteraction(begun.journey.id)
  assert.equal(interaction.plan.features, 'noopener,noreferrer')
  assert.equal(interaction.session.contextSessionId, begun.journey.contextSessionId)
  assert.equal(env.journeys.get(begun.journey.id)?.browserSessionId, interaction.session.id)

  const completedInteraction = env.runtime.completeInteraction(begun.journey.id, 'The external interaction was explicitly completed.')
  assert.equal(completedInteraction.experience.browserSessionId, interaction.session.id)
  assert.equal(completedInteraction.candidate.status, 'pending')

  const promoted = env.runtime.promoteReflection(begun.journey.id, 'MVP reflection', 'The explicit experience became a local reflection.')
  assert.equal(promoted.post.sourceSessionId, interaction.session.id)
  assert.equal(promoted.candidate.status, 'promoted')

  const finished = env.runtime.finish(begun.journey.id)
  assert.equal(finished.journey.status, 'completed')
  assert.equal(finished.evaluation.complete, true)
  assert.equal(finished.evaluation.coherent, true)
  assert.equal(env.principals.getActive().id, env.root.id)
  assert.equal(env.spaces.getActivePresence(begun.journey.projectionPrincipalId), undefined)
  assert.equal(env.contexts.get(begun.journey.contextSessionId)?.status, 'closed')

  const reloadedPrincipals = new PrincipalStore(env.storage)
  const reloadedRuntime = new MvpJourneyRuntime({
    journeys: new MvpJourneyStore(env.storage),
    principals: reloadedPrincipals,
    contexts: new ContextSessionStore(env.storage),
    projections: new ProjectionStore(env.storage, reloadedPrincipals),
    spaces: new SpaceStore(env.storage, reloadedPrincipals),
    resources: new ResourceStore(env.storage),
    browsers: new BrowserSessionStore(env.storage),
    posts: new PostStore(env.storage),
    capabilities,
  })
  const reloadedEvaluation = reloadedRuntime.evaluate(begun.journey.id)
  assert.equal(reloadedEvaluation.complete, true)
  assert.equal(reloadedEvaluation.coherent, true)
  assert.deepEqual(reloadedEvaluation.stages.map((stage) => stage.status), Array(9).fill('pass'))
})

test('MvpJourneyRuntime begin rejects an already-active root ContextSession before creating a Projection', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo', type: 'game', url: 'https://example.com/' })
  env.contexts.start({ principalId: env.root.id, label: 'Existing work' })
  assert.throws(
    () => env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id, label: 'MVP' }),
    /already has an active context/i,
  )
  assert.equal(env.projections.list().length, 0)
  assert.equal(env.journeys.list().length, 0)
})

test('MvpJourneyRuntime abandon returns to Root, closes context, and abandons an active BrowserSession without fabricating Experience', () => {
  const env = setup()
  const resource = env.resources.add({ title: 'Demo', type: 'game', url: 'https://example.com/' })
  const { journey } = env.runtime.begin({ rootPrincipalId: env.root.id, spaceId: 'arcade', resourceId: resource.id, label: 'MVP' })
  const { session } = env.runtime.startInteraction(journey.id)

  const abandoned = env.runtime.abandon(journey.id, 'popup blocked')
  assert.equal(abandoned.status, 'abandoned')
  assert.equal(env.browsers.get(session.id)?.status, 'abandoned')
  assert.equal(env.browsers.experiences().length, 0)
  assert.equal(env.principals.getActive().id, env.root.id)
  assert.equal(env.contexts.get(journey.contextSessionId)?.status, 'closed')
  assert.equal(env.spaces.getActivePresence(journey.projectionPrincipalId), undefined)
})
