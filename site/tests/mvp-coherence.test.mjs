import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateMvpJourney } from '../src/core/mvpJourneys.ts'

function coherentFixture(status = 'completed') {
  const journey = {
    id: 'journey:1', label: 'Demo', status,
    rootPrincipalId: 'agent:root', contextSessionId: 'ctx:1', projectionId: 'proj:1',
    projectionPrincipalId: 'projection:1', spaceId: 'arcade', capabilityId: 'arcade', resourceId: 'resource:1',
    browserSessionId: 'browser:1', experienceId: 'experience:1', reflectionCandidateId: 'candidate:1',
    reflectionPostId: 'post:1', startedAt: '2026-08-20T04:00:00Z', updatedAt: '2026-08-20T04:10:00Z',
    ...(status === 'completed' ? { completedAt: '2026-08-20T04:10:00Z' } : {}),
  }
  const sources = {
    principals: [
      { id: 'agent:root', type: 'agent', displayName: 'Root', createdAt: 'x', updatedAt: 'x' },
      { id: 'projection:1', type: 'projection', displayName: 'Slice', ownerId: 'agent:root', createdAt: 'x', updatedAt: 'x' },
    ],
    contextSessions: [
      { id: 'ctx:1', principalId: 'agent:root', label: 'Demo', status: status === 'completed' ? 'closed' : 'active', startedAt: 'x', ...(status === 'completed' ? { endedAt: 'y' } : {}) },
    ],
    projections: [
      { id: 'proj:1', principalId: 'projection:1', rootPrincipalId: 'agent:root', spaceId: 'arcade', status: 'active', permissionScope: ['arcade:START_BROWSER_SESSION'], memoryScope: [], mergePolicy: 'reviewed', createdAt: 'x', updatedAt: 'x' },
    ],
    spaces: [
      { id: 'arcade', name: 'Arcade', ownerPrincipalId: 'agent:root', visibility: 'shared', status: 'active', createdAt: 'x', updatedAt: 'x' },
    ],
    memberships: [{ spaceId: 'arcade', principalId: 'agent:root', role: 'owner', joinedAt: 'x' }],
    presences: status === 'completed' ? [] : [{ principalId: 'projection:1', spaceId: 'arcade', enteredAt: 'x' }],
    capabilities: [{ id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready', actions: ['START_BROWSER_SESSION'] }],
    resources: [{ id: 'resource:1', title: 'Game', type: 'game', url: 'https://example.com/', createdAt: 'x' }],
    browserSessions: [{ id: 'browser:1', principalId: 'projection:1', projectionId: 'proj:1', rootPrincipalId: 'agent:root', spaceId: 'arcade', contextSessionId: 'ctx:1', resourceId: 'resource:1', url: 'https://example.com/', status: 'completed', trust: 'untrusted-external', isolation: 'noopener-noreferrer-only', startedAt: 'x', endedAt: 'y' }],
    experiences: [{ id: 'experience:1', browserSessionId: 'browser:1', principalId: 'projection:1', projectionId: 'proj:1', rootPrincipalId: 'agent:root', spaceId: 'arcade', contextSessionId: 'ctx:1', resourceId: 'resource:1', summary: 'Played it.', createdAt: 'y', reflectionPostId: 'post:1' }],
    reflectionCandidates: [{ id: 'candidate:1', experienceId: 'experience:1', status: 'promoted', createdAt: 'y', promotedAt: 'z', postId: 'post:1' }],
    posts: [{ id: 'post:1', principalId: 'projection:1', title: 'Reflection', body: 'Played it.', createdAt: 'z', contextSessionId: 'ctx:1', sourceSessionId: 'browser:1', sourceResourceId: 'resource:1' }],
    activePrincipalId: status === 'completed' ? 'agent:root' : 'projection:1',
  }
  return { journey, sources }
}

test('evaluateMvpJourney passes every stage for a coherent completed journey', () => {
  const { journey, sources } = coherentFixture('completed')
  const result = evaluateMvpJourney(journey, sources)
  assert.equal(result.coherent, true)
  assert.equal(result.complete, true)
  assert.deepEqual(result.errors, [])
  assert.equal(result.stages.length, 9)
  assert.deepEqual(result.stages.map((stage) => stage.status), Array(9).fill('pass'))
})

test('evaluateMvpJourney treats future stages as pending for a coherent active journey', () => {
  const { journey, sources } = coherentFixture('active')
  delete journey.browserSessionId
  delete journey.experienceId
  delete journey.reflectionCandidateId
  delete journey.reflectionPostId
  sources.browserSessions = []
  sources.experiences = []
  sources.reflectionCandidates = []
  sources.posts = []

  const result = evaluateMvpJourney(journey, sources)
  assert.equal(result.coherent, true)
  assert.equal(result.complete, false)
  assert.equal(result.stages.find((stage) => stage.key === 'interaction')?.status, 'pending')
  assert.equal(result.stages.find((stage) => stage.key === 'experience')?.status, 'pending')
  assert.equal(result.stages.find((stage) => stage.key === 'reflection')?.status, 'pending')
  assert.equal(result.stages.find((stage) => stage.key === 'return')?.status, 'pending')
})

test('evaluateMvpJourney fails on cross-store experience lineage mismatch', () => {
  const { journey, sources } = coherentFixture('completed')
  sources.experiences[0] = { ...sources.experiences[0], browserSessionId: 'browser:other' }
  const result = evaluateMvpJourney(journey, sources)
  assert.equal(result.coherent, false)
  assert.equal(result.complete, false)
  assert.equal(result.stages.find((stage) => stage.key === 'experience')?.status, 'fail')
  assert.match(result.errors.join('\n'), /experience.*browser/i)
})

test('evaluateMvpJourney fails completed return stage when Projection presence or active Principal was not restored', () => {
  const { journey, sources } = coherentFixture('completed')
  sources.activePrincipalId = 'projection:1'
  sources.presences = [{ principalId: 'projection:1', spaceId: 'arcade', enteredAt: 'x' }]
  const result = evaluateMvpJourney(journey, sources)
  assert.equal(result.coherent, false)
  assert.equal(result.stages.find((stage) => stage.key === 'return')?.status, 'fail')
  assert.match(result.errors.join('\n'), /return/i)
})

test('evaluateMvpJourney fails when the referenced capability is absent', () => {
  const { journey, sources } = coherentFixture('completed')
  sources.capabilities = []
  const result = evaluateMvpJourney(journey, sources)
  assert.equal(result.stages.find((stage) => stage.key === 'capability')?.status, 'fail')
  assert.equal(result.coherent, false)
})
