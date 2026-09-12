import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { ProjectionStore } from '../src/core/projections.ts'
import { BrowserSessionStore, createBrowserLaunchPlan } from '../src/core/browserSessions.ts'

function setup(permissionScope = ['arcade:START_BROWSER_SESSION']) {
  const storage = new MemoryStorageAdapter()
  let principalCounter = 0
  const principals = new PrincipalStore(
    storage,
    () => '2026-08-20T02:40:00.000Z',
    () => `principal-${++principalCounter}`,
  )
  principals.ensureDefault()
  const projections = new ProjectionStore(
    storage,
    principals,
    () => '2026-08-20T02:41:00.000Z',
    () => 'proj:arcade',
    () => 'checkpoint:unused',
    () => 'merge:unused',
  )
  const projection = projections.create({
    rootPrincipalId: 'agent:local-demo',
    spaceId: 'arcade',
    permissionScope,
    memoryScope: ['arcade-profile'],
  })
  const resource = {
    id: 'game:1',
    title: 'External Game',
    type: 'game',
    url: 'https://example.com/play',
    createdAt: '2026-08-20T02:39:00.000Z',
  }
  return { storage, principals, projections, projection, resource }
}

test('createBrowserLaunchPlan requires an active Projection and explicit Arcade permission', () => {
  const { projection, resource } = setup([])
  assert.throws(() => createBrowserLaunchPlan(undefined, resource), /active projection/i)
  assert.throws(() => createBrowserLaunchPlan(projection, resource), /permission denied/i)
})

test('createBrowserLaunchPlan declares the exact external trust and noopener-noreferrer boundary', () => {
  const { projection, resource } = setup()
  const plan = createBrowserLaunchPlan(projection, resource)

  assert.deepEqual(plan, {
    url: 'https://example.com/play',
    target: '_blank',
    features: 'noopener,noreferrer',
    trust: 'untrusted-external',
    isolation: 'noopener-noreferrer-only',
    projectionId: 'proj:arcade',
    principalId: projection.principalId,
    rootPrincipalId: 'agent:local-demo',
    spaceId: 'arcade',
  })
})

test('BrowserSessionStore starts a Projection-scoped external session and persists explicit lineage', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(
    storage,
    () => '2026-08-20T02:42:00.000Z',
    () => 'browser:1',
    () => 'experience:1',
    () => 'candidate:1',
  )

  const session = store.start({ projection, resource, contextSessionId: 'ctx:arcade' })

  assert.equal(session.id, 'browser:1')
  assert.equal(session.status, 'active')
  assert.equal(session.principalId, projection.principalId)
  assert.equal(session.projectionId, projection.id)
  assert.equal(session.rootPrincipalId, projection.rootPrincipalId)
  assert.equal(session.spaceId, projection.spaceId)
  assert.equal(session.contextSessionId, 'ctx:arcade')
  assert.equal(session.resourceId, resource.id)
  assert.equal(session.url, resource.url)
  assert.equal(session.trust, 'untrusted-external')
  assert.equal(session.isolation, 'noopener-noreferrer-only')

  const reloaded = new BrowserSessionStore(storage)
  assert.equal(reloaded.get('browser:1')?.projectionId, projection.id)
})

test('BrowserSessionStore rejects duplicate active browser sessions for the same Projection and resource', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(storage, () => '2026-08-20T02:42:00.000Z', () => 'browser:1')
  store.start({ projection, resource })
  assert.throws(() => store.start({ projection, resource }), /already active/i)
})

test('completing an active Browser Session creates one ExperienceRecord and one pending ReflectionCandidate', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(
    storage,
    () => '2026-08-20T03:00:00.000Z',
    () => 'browser:complete',
    () => 'experience:complete',
    () => 'candidate:complete',
  )
  const session = store.start({ projection, resource, contextSessionId: 'ctx:1' })
  const result = store.complete(session.id, '  Learned to preserve state across an external turn.  ')

  assert.equal(result.session.status, 'completed')
  assert.equal(result.session.endedAt, '2026-08-20T03:00:00.000Z')
  assert.equal(result.experience.id, 'experience:complete')
  assert.equal(result.experience.browserSessionId, session.id)
  assert.equal(result.experience.summary, 'Learned to preserve state across an external turn.')
  assert.equal(result.experience.projectionId, projection.id)
  assert.equal(result.experience.contextSessionId, 'ctx:1')
  assert.equal(result.candidate.id, 'candidate:complete')
  assert.equal(result.candidate.status, 'pending')
  assert.equal(result.candidate.experienceId, result.experience.id)
  assert.equal(store.experiences().length, 1)
  assert.equal(store.reflectionCandidates().length, 1)
})

test('complete requires a non-empty experience summary and only active sessions can complete', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(storage, () => '2026-08-20T03:00:00.000Z', () => 'browser:1')
  const session = store.start({ projection, resource })
  assert.throws(() => store.complete(session.id, '   '), /summary is required/i)
  store.complete(session.id, 'done')
  assert.throws(() => store.complete(session.id, 'again'), /only active/i)
})

test('abandon closes a Browser Session without creating Experience or ReflectionCandidate records', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(storage, () => '2026-08-20T03:05:00.000Z', () => 'browser:abandon')
  const session = store.start({ projection, resource })
  const abandoned = store.abandon(session.id, ' popup-blocked ')

  assert.equal(abandoned.status, 'abandoned')
  assert.equal(abandoned.abandonReason, 'popup-blocked')
  assert.equal(abandoned.endedAt, '2026-08-20T03:05:00.000Z')
  assert.equal(store.experiences().length, 0)
  assert.equal(store.reflectionCandidates().length, 0)
  assert.throws(() => store.abandon(session.id, 'again'), /only active/i)
})

test('promoting a ReflectionCandidate links the Board post to the Experience and is terminal', () => {
  const { storage, projection, resource } = setup()
  const store = new BrowserSessionStore(
    storage,
    () => '2026-08-20T03:10:00.000Z',
    () => 'browser:promote',
    () => 'experience:promote',
    () => 'candidate:promote',
  )
  const session = store.start({ projection, resource })
  const { experience, candidate } = store.complete(session.id, 'Useful experience')
  const promoted = store.promoteReflection(candidate.id, 'post:1')

  assert.equal(promoted.status, 'promoted')
  assert.equal(promoted.postId, 'post:1')
  assert.equal(promoted.promotedAt, '2026-08-20T03:10:00.000Z')
  assert.equal(store.experiences().find((item) => item.id === experience.id)?.reflectionPostId, 'post:1')
  assert.throws(() => store.promoteReflection(candidate.id, 'post:2'), /already promoted/i)
})
