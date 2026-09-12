import test from 'node:test'
import assert from 'node:assert/strict'
import { auditAiSpaceState } from '../src/core/hardening.ts'

function baseSources() {
  return {
    principals: [
      { id: 'agent:root', type: 'agent', displayName: 'Root', createdAt: 'x', updatedAt: 'x' },
      { id: 'projection:1', type: 'projection', displayName: 'Slice', ownerId: 'agent:root', createdAt: 'x', updatedAt: 'x' },
    ],
    contextSessions: [{ id: 'ctx:1', principalId: 'agent:root', label: 'Work', status: 'active', startedAt: 'x' }],
    projections: [{ id: 'proj:1', principalId: 'projection:1', rootPrincipalId: 'agent:root', spaceId: 'arcade', status: 'active', permissionScope: ['arcade:START_BROWSER_SESSION'], memoryScope: [], mergePolicy: 'reviewed', createdAt: 'x', updatedAt: 'x' }],
    spaces: [{ id: 'arcade', name: 'Arcade', ownerPrincipalId: 'agent:root', visibility: 'shared', status: 'active', createdAt: 'x', updatedAt: 'x' }],
    memberships: [{ spaceId: 'arcade', principalId: 'agent:root', role: 'owner', joinedAt: 'x' }],
    presences: [{ principalId: 'projection:1', spaceId: 'arcade', enteredAt: 'x' }],
    resourceRefs: [{ id: 'ref:1', spaceId: 'arcade', resourceId: 'resource:1', addedByPrincipalId: 'projection:1', addedAt: 'x' }],
    capabilities: [{ id: 'arcade', label: 'Arcade', description: '', route: '/arcade', mode: 'native', status: 'ready', actions: ['START_BROWSER_SESSION'] }],
    resources: [{ id: 'resource:1', title: 'Game', type: 'game', url: 'https://example.com', createdAt: 'x' }],
    browserSessions: [], experiences: [], reflectionCandidates: [], posts: [], journeys: [],
    activePrincipalId: 'projection:1',
  }
}

test('auditAiSpaceState returns no errors for a coherent runtime snapshot', () => {
  const report = auditAiSpaceState(baseSources())
  assert.deepEqual(report.findings.filter((item) => item.severity === 'error'), [])
})

test('auditAiSpaceState detects orphan and cross-space derived state without mutating input', () => {
  const sources = baseSources()
  sources.spaces.push({ id: 'research', name: 'Research', ownerPrincipalId: 'agent:root', visibility: 'shared', status: 'active', createdAt: 'x', updatedAt: 'x' })
  sources.presences = [
    { principalId: 'projection:1', spaceId: 'research', enteredAt: 'x' },
    { principalId: 'missing', spaceId: 'arcade', enteredAt: 'x' },
  ]
  sources.resourceRefs = [{ id: 'ref:missing', spaceId: 'arcade', resourceId: 'resource:missing', addedByPrincipalId: 'agent:root', addedAt: 'x' }]
  const before = JSON.stringify(sources)
  const report = auditAiSpaceState(sources)
  const codes = new Set(report.findings.map((item) => item.code))
  assert.equal(codes.has('projection-presence-space-mismatch'), true)
  assert.equal(codes.has('space-presence-principal-missing'), true)
  assert.equal(codes.has('space-resource-missing'), true)
  assert.equal(JSON.stringify(sources), before)
})

test('auditAiSpaceState detects Browser/Experience/Reflection lineage damage', () => {
  const sources = baseSources()
  sources.browserSessions = [{ id: 'browser:1', principalId: 'projection:1', projectionId: 'proj:missing', rootPrincipalId: 'agent:root', spaceId: 'arcade', contextSessionId: 'ctx:1', resourceId: 'resource:1', url: 'https://example.com', status: 'completed', trust: 'untrusted-external', isolation: 'noopener-noreferrer-only', startedAt: 'x', endedAt: 'y' }]
  sources.experiences = [{ id: 'experience:1', browserSessionId: 'browser:missing', principalId: 'projection:1', projectionId: 'proj:1', rootPrincipalId: 'agent:root', spaceId: 'arcade', contextSessionId: 'ctx:1', resourceId: 'resource:1', summary: 'x', createdAt: 'y' }]
  sources.reflectionCandidates = [{ id: 'candidate:1', experienceId: 'experience:missing', status: 'promoted', createdAt: 'y', promotedAt: 'z', postId: 'post:missing' }]
  const codes = new Set(auditAiSpaceState(sources).findings.map((item) => item.code))
  assert.equal(codes.has('browser-projection-missing'), true)
  assert.equal(codes.has('experience-browser-missing'), true)
  assert.equal(codes.has('reflection-experience-missing'), true)
  assert.equal(codes.has('reflection-post-missing'), true)
})
