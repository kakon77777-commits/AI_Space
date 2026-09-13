import type {
  ActivityArtifactRef,
  ActivityDefinition,
  ActivityInstance,
  AiSpaceAuditFinding,
  AiSpaceAuditReport,
  BoardPost,
  BrowserSession,
  Capability,
  ContextSession,
  ExperienceRecord,
  ExperienceReflectionCandidate,
  ExternalResource,
  MvpJourney,
  Principal,
  Projection,
  Space,
  SpaceMembership,
  SpacePresence,
  SpaceResourceRef,
} from './types.ts'
import { evaluateMvpJourney } from './mvpJourneys.ts'
import { inspectActivityArtifacts, inspectActivityInstances } from './activities.ts'

export interface AiSpaceAuditSources {
  principals: Principal[]
  contextSessions: ContextSession[]
  projections: Projection[]
  spaces: Space[]
  memberships: SpaceMembership[]
  presences: SpacePresence[]
  resourceRefs: SpaceResourceRef[]
  capabilities: Capability[]
  resources: ExternalResource[]
  browserSessions: BrowserSession[]
  experiences: ExperienceRecord[]
  reflectionCandidates: ExperienceReflectionCandidate[]
  posts: BoardPost[]
  journeys: MvpJourney[]
  activityDefinitions?: ActivityDefinition[]
  activityInstances?: unknown
  activityArtifacts?: unknown
  activityFieldNoteIds?: string[]
  activePrincipalId: string
}

export function auditAiSpaceState(sources: AiSpaceAuditSources): AiSpaceAuditReport {
  const findings: AiSpaceAuditFinding[] = []
  const error = (code: string, entityType: string, entityId: string | undefined, detail: string) => {
    findings.push({ severity: 'error', code, entityType, ...(entityId ? { entityId } : {}), detail })
  }
  const warning = (code: string, entityType: string, entityId: string | undefined, detail: string) => {
    findings.push({ severity: 'warning', code, entityType, ...(entityId ? { entityId } : {}), detail })
  }

  const principals = new Map(sources.principals.map((item) => [item.id, item]))
  const projections = new Map(sources.projections.map((item) => [item.id, item]))
  const projectionsByPrincipal = new Map(sources.projections.map((item) => [item.principalId, item]))
  const spaces = new Map(sources.spaces.map((item) => [item.id, item]))
  const resources = new Map(sources.resources.map((item) => [item.id, item]))
  const contexts = new Map(sources.contextSessions.map((item) => [item.id, item]))
  const browsers = new Map(sources.browserSessions.map((item) => [item.id, item]))
  const experiences = new Map(sources.experiences.map((item) => [item.id, item]))
  const posts = new Map(sources.posts.map((item) => [item.id, item]))
  const activityInstanceInspection = inspectActivityInstances(sources.activityInstances === undefined ? [] : sources.activityInstances)
  const activityArtifactInspection = inspectActivityArtifacts(sources.activityArtifacts === undefined ? [] : sources.activityArtifacts)
  for (const finding of [...activityInstanceInspection.findings, ...activityArtifactInspection.findings]) {
    error(finding.code, finding.entityType, finding.entityId, finding.detail)
  }
  const auditedActivityInstances = activityInstanceInspection.records
  const auditedActivityArtifacts = activityArtifactInspection.records
  const activityDefinitions = new Map((sources.activityDefinitions ?? []).map((item) => [item.id, item]))
  const activityInstances = new Map(auditedActivityInstances.map((item) => [item.id, item]))
  const activityFieldNoteIds = new Set(sources.activityFieldNoteIds ?? [])
  const memberships = new Set(sources.memberships.map((item) => `${item.spaceId}\u0000${item.principalId}`))

  if (!principals.has(sources.activePrincipalId)) {
    error('active-principal-missing', 'principal', sources.activePrincipalId, 'Active Principal reference does not exist.')
  }

  for (const context of sources.contextSessions) {
    if (!principals.has(context.principalId)) {
      error('context-principal-missing', 'context-session', context.id, `Context Session Principal ${context.principalId} is missing.`)
    }
  }

  for (const projection of sources.projections) {
    const root = principals.get(projection.rootPrincipalId)
    const principal = principals.get(projection.principalId)
    if (!root || root.type === 'projection') {
      error('projection-root-invalid', 'projection', projection.id, 'Projection Root Principal is missing or is itself a Projection.')
    }
    if (!principal || principal.type !== 'projection' || principal.ownerId !== projection.rootPrincipalId) {
      error('projection-principal-invalid', 'projection', projection.id, 'Projection Principal lineage is missing or inconsistent.')
    }
    if (!spaces.has(projection.spaceId)) {
      error('projection-space-missing', 'projection', projection.id, `Bound Space ${projection.spaceId} is missing.`)
    } else if (!memberships.has(`${projection.spaceId}\u0000${projection.rootPrincipalId}`)) {
      error('projection-root-membership-missing', 'projection', projection.id, 'Projection Root is not a member of the bound Space.')
    }
  }

  for (const membership of sources.memberships) {
    if (!spaces.has(membership.spaceId)) error('space-membership-space-missing', 'space-membership', `${membership.spaceId}:${membership.principalId}`, 'Membership references a missing Space.')
    const principal = principals.get(membership.principalId)
    if (!principal) error('space-membership-principal-missing', 'space-membership', `${membership.spaceId}:${membership.principalId}`, 'Membership references a missing Principal.')
    else if (principal.type === 'projection') error('space-membership-projection-invalid', 'space-membership', `${membership.spaceId}:${membership.principalId}`, 'Projection Principals must not be direct Space members.')
  }

  for (const presence of sources.presences) {
    const principal = principals.get(presence.principalId)
    const space = spaces.get(presence.spaceId)
    if (!principal) {
      error('space-presence-principal-missing', 'space-presence', presence.principalId, 'Presence references a missing Principal.')
      continue
    }
    if (!space) {
      error('space-presence-space-missing', 'space-presence', presence.principalId, `Presence references missing Space ${presence.spaceId}.`)
      continue
    }
    if (space.status !== 'active') error('space-presence-archived-space', 'space-presence', presence.principalId, 'Presence remains in an archived Space.')
    if (principal.type === 'projection') {
      const projection = projectionsByPrincipal.get(principal.id)
      if (!projection) error('projection-presence-orphan', 'space-presence', principal.id, 'Projection Principal presence has no Projection record.')
      else {
        if (projection.spaceId !== presence.spaceId) error('projection-presence-space-mismatch', 'space-presence', principal.id, `Presence is in ${presence.spaceId}, but Projection is bound to ${projection.spaceId}.`)
        if (projection.status !== 'active') error('projection-presence-inactive', 'space-presence', principal.id, `Presence remains while Projection is ${projection.status}.`)
        if (!memberships.has(`${projection.spaceId}\u0000${projection.rootPrincipalId}`)) error('projection-presence-root-membership-missing', 'space-presence', principal.id, 'Projection presence survives without Root membership in the bound Space.')
      }
    } else if (!memberships.has(`${presence.spaceId}\u0000${principal.id}`)) {
      error('root-presence-membership-missing', 'space-presence', principal.id, 'Root Principal presence survives without Space membership.')
    }
  }

  for (const ref of sources.resourceRefs) {
    if (!spaces.has(ref.spaceId)) error('space-resource-space-missing', 'space-resource-ref', ref.id, `Resource reference points to missing Space ${ref.spaceId}.`)
    if (!resources.has(ref.resourceId)) error('space-resource-missing', 'space-resource-ref', ref.id, `Canonical Resource ${ref.resourceId} is missing.`)
    if (!principals.has(ref.addedByPrincipalId)) warning('space-resource-actor-missing', 'space-resource-ref', ref.id, `Adding Principal ${ref.addedByPrincipalId} no longer exists.`)
  }

  for (const browser of sources.browserSessions) {
    const projection = projections.get(browser.projectionId)
    if (!projection) error('browser-projection-missing', 'browser-session', browser.id, `Projection ${browser.projectionId} is missing.`)
    else if (
      projection.principalId !== browser.principalId
      || projection.rootPrincipalId !== browser.rootPrincipalId
      || projection.spaceId !== browser.spaceId
    ) error('browser-lineage-mismatch', 'browser-session', browser.id, 'Browser Session lineage disagrees with its Projection.')
    if (!resources.has(browser.resourceId)) error('browser-resource-missing', 'browser-session', browser.id, `Resource ${browser.resourceId} is missing.`)
    if (browser.contextSessionId && !contexts.has(browser.contextSessionId)) error('browser-context-missing', 'browser-session', browser.id, `Context Session ${browser.contextSessionId} is missing.`)
  }

  for (const experience of sources.experiences) {
    const browser = browsers.get(experience.browserSessionId)
    if (!browser) error('experience-browser-missing', 'experience', experience.id, `Browser Session ${experience.browserSessionId} is missing.`)
    else if (
      browser.projectionId !== experience.projectionId
      || browser.principalId !== experience.principalId
      || browser.rootPrincipalId !== experience.rootPrincipalId
      || browser.spaceId !== experience.spaceId
      || browser.resourceId !== experience.resourceId
      || browser.contextSessionId !== experience.contextSessionId
    ) error('experience-lineage-mismatch', 'experience', experience.id, 'Experience lineage disagrees with its Browser Session.')
  }

  for (const candidate of sources.reflectionCandidates) {
    const experience = experiences.get(candidate.experienceId)
    if (!experience) error('reflection-experience-missing', 'reflection-candidate', candidate.id, `Experience ${candidate.experienceId} is missing.`)
    if (candidate.status === 'promoted') {
      if (!candidate.postId || !posts.has(candidate.postId)) error('reflection-post-missing', 'reflection-candidate', candidate.id, 'Promoted Reflection Candidate references a missing Board post.')
      else if (experience?.reflectionPostId !== candidate.postId) error('reflection-lineage-mismatch', 'reflection-candidate', candidate.id, 'Experience and Reflection Candidate disagree on the promoted post.')
    }
  }

  for (const journey of sources.journeys) {
    const evaluation = evaluateMvpJourney(journey, sources)
    for (const detail of evaluation.errors) error('journey-incoherent', 'mvp-journey', journey.id, detail)
  }

  for (const activity of auditedActivityInstances) {
    const definition = activityDefinitions.get(activity.definitionId)
    const principal = principals.get(activity.principalId)
    const root = principals.get(activity.rootPrincipalId)
    const projection = activity.projectionId ? projections.get(activity.projectionId) : undefined

    if (!definition) error('activity-definition-missing', 'activity-instance', activity.id, `ActivityDefinition ${activity.definitionId} is missing.`)
    else {
      if (definition.version !== activity.definitionVersion) warning('activity-definition-version-drift', 'activity-instance', activity.id, `Activity uses ${activity.definitionVersion}; catalog exposes ${definition.version}.`)
      if (definition.requiresProjection && !activity.projectionId) error('activity-projection-required', 'activity-instance', activity.id, 'ActivityDefinition requires a Projection, but the instance has none.')
      if (definition.allowedSpaceIds.length > 0 && (!activity.spaceId || !definition.allowedSpaceIds.includes(activity.spaceId))) {
        error('activity-space-not-allowed', 'activity-instance', activity.id, 'Activity Space is outside the ActivityDefinition allowlist.')
      }
    }
    if (!principal) error('activity-principal-missing', 'activity-instance', activity.id, `Principal ${activity.principalId} is missing.`)
    if (!root || root.type === 'projection') error('activity-root-invalid', 'activity-instance', activity.id, `Root Principal ${activity.rootPrincipalId} is missing or is a Projection.`)
    if (activity.spaceId && !spaces.has(activity.spaceId)) error('activity-space-missing', 'activity-instance', activity.id, `Space ${activity.spaceId} is missing.`)
    if (activity.projectionId) {
      if (!projection) error('activity-projection-missing', 'activity-instance', activity.id, `Projection ${activity.projectionId} is missing.`)
      else if (projection.principalId !== activity.principalId || projection.rootPrincipalId !== activity.rootPrincipalId || projection.spaceId !== activity.spaceId) {
        error('activity-projection-lineage-mismatch', 'activity-instance', activity.id, 'Activity lineage disagrees with its Projection.')
      }
    } else if (activity.principalId !== activity.rootPrincipalId) {
      error('activity-root-lineage-mismatch', 'activity-instance', activity.id, 'Root-local Activity must use the Root Principal as its acting Principal.')
    }
    if (activity.status === 'active' && !activity.startedAt) error('activity-start-time-missing', 'activity-instance', activity.id, 'Active Activity has no startedAt timestamp.')
    if (activity.status === 'completed' && (!activity.completedAt || !activity.resultSummary?.trim())) error('activity-completion-invalid', 'activity-instance', activity.id, 'Completed Activity lacks completion time or result summary.')
    if (activity.status === 'abandoned' && (!activity.abandonedAt || !activity.terminalReason?.trim())) error('activity-abandonment-invalid', 'activity-instance', activity.id, 'Abandoned Activity lacks terminal evidence.')
    if (activity.status === 'failed' && (!activity.failedAt || !activity.terminalReason?.trim())) error('activity-failure-invalid', 'activity-instance', activity.id, 'Failed Activity lacks terminal evidence.')
  }

  for (const artifact of auditedActivityArtifacts) {
    const activity = activityInstances.get(artifact.activityInstanceId)
    if (!activity) error('activity-artifact-instance-missing', 'activity-artifact-ref', artifact.id, `ActivityInstance ${artifact.activityInstanceId} is missing.`)
    if (!principals.has(artifact.principalId)) error('activity-artifact-principal-missing', 'activity-artifact-ref', artifact.id, `Principal ${artifact.principalId} is missing.`)
    else if (activity && activity.principalId !== artifact.principalId && activity.rootPrincipalId !== artifact.principalId) {
      error('activity-artifact-principal-mismatch', 'activity-artifact-ref', artifact.id, 'Artifact Principal is outside the Activity lineage.')
    }
    const targetExists = artifact.artifactType === 'board-post'
      ? posts.has(artifact.artifactId)
      : artifact.artifactType === 'experience'
        ? experiences.has(artifact.artifactId)
        : artifact.artifactType === 'resource'
          ? resources.has(artifact.artifactId)
          : activityFieldNoteIds.has(artifact.artifactId)
    if (!targetExists) error('activity-artifact-target-missing', 'activity-artifact-ref', artifact.id, `${artifact.artifactType} target ${artifact.artifactId} is missing.`)
  }

  return {
    findings,
    errorCount: findings.filter((item) => item.severity === 'error').length,
    warningCount: findings.filter((item) => item.severity === 'warning').length,
  }
}
