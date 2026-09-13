import assert from 'node:assert/strict'
import test from 'node:test'

import { auditAiSpaceState } from '../src/core/hardening.ts'
import { activityDefinitions } from '../src/data/activities.ts'

function baseSources() {
  return {
    principals: [{ id: 'agent:root', type: 'agent', displayName: 'Root', createdAt: 'x', updatedAt: 'x' }],
    contextSessions: [], projections: [], spaces: [], memberships: [], presences: [], resourceRefs: [],
    capabilities: [], resources: [], browserSessions: [], experiences: [], reflectionCandidates: [], posts: [], journeys: [],
    activityDefinitions,
    activityInstances: [{
      id: 'activity-instance:1', definitionId: 'activity:world:compare', definitionVersion: '1.0.0',
      principalId: 'agent:root', rootPrincipalId: 'agent:root', status: 'active', draft: {},
      createdAt: 'x', readyAt: 'x', startedAt: 'x', updatedAt: 'x',
    }],
    activityArtifacts: [],
    activePrincipalId: 'agent:root',
  }
}

test('hardening accepts a coherent root-local Activity', () => {
  assert.equal(auditAiSpaceState(baseSources()).errorCount, 0)
})

test('hardening detects missing Activity definition, Principal, and artifact target', () => {
  const sources = baseSources()
  sources.activityInstances[0] = { ...sources.activityInstances[0], definitionId: 'activity:missing', principalId: 'agent:missing' }
  sources.activityArtifacts = [{
    id: 'activity-artifact:1', activityInstanceId: 'activity-instance:missing', artifactType: 'board-post',
    artifactId: 'post:missing', principalId: 'agent:missing', createdAt: 'x',
  }]
  const codes = new Set(auditAiSpaceState(sources).findings.map((finding) => finding.code))
  assert.equal(codes.has('activity-definition-missing'), true)
  assert.equal(codes.has('activity-principal-missing'), true)
  assert.equal(codes.has('activity-artifact-instance-missing'), true)
  assert.equal(codes.has('activity-artifact-target-missing'), true)
})

test('hardening rejects malformed Activity records, lifecycle gaps, and duplicate active work', () => {
  const sources = baseSources()
  sources.activityInstances = [
    { ...sources.activityInstances[0], status: 'bogus' },
    { ...sources.activityInstances[0], id: 'activity-instance:null-draft', draft: null },
    { ...sources.activityInstances[0], id: 'activity-instance:invalid-draft-value', draft: { invalid: 42 } },
    { ...sources.activityInstances[0], id: 'activity-instance:suspended', status: 'suspended', suspendedAt: undefined },
    { ...sources.activityInstances[0], id: 'activity-instance:duplicate' },
    { ...sources.activityInstances[0], id: 'activity-instance:terminal-duplicate-id', status: 'completed', completedAt: 'x', resultSummary: 'One' },
    { ...sources.activityInstances[0], id: 'activity-instance:terminal-duplicate-id', status: 'completed', completedAt: 'x', resultSummary: 'Two' },
  ]
  const codes = new Set(auditAiSpaceState(sources).findings.map((finding) => finding.code))
  assert.equal(codes.has('activity-instance-status-invalid'), true)
  assert.equal(codes.has('activity-instance-draft-invalid'), true)
  assert.equal(codes.has('activity-instance-lifecycle-invalid'), true)
  assert.equal(codes.has('activity-instance-non-terminal-duplicate'), true)
  assert.equal(codes.has('activity-instance-id-duplicate'), true)
})

test('hardening rejects non-array Activity stores and malformed artifact references', () => {
  const sources = baseSources()
  sources.activityInstances = null
  sources.activityArtifacts = [{
    id: 'activity-artifact:1', activityInstanceId: 'activity-instance:1', artifactType: 'bogus',
    artifactId: 'resource:wikipedia', principalId: 'agent:root', createdAt: 'x',
  }]
  const codes = new Set(auditAiSpaceState(sources).findings.map((finding) => finding.code))
  assert.equal(codes.has('activity-instance-state-not-array'), true)
  assert.equal(codes.has('activity-artifact-type-invalid'), true)
})
