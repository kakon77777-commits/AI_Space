
export type PrincipalType = 'human' | 'agent' | 'service' | 'projection'

export interface Principal {
  id: string
  type: PrincipalType
  displayName: string
  ownerId?: string
  provider?: string
  modelFamily?: string
  instanceId?: string
  createdAt: string
  updatedAt: string
}





export type SpaceStatus = 'active' | 'archived'
export type SpaceVisibility = 'private' | 'shared'
export type SpaceMembershipRole = 'owner' | 'member'

export interface Space {
  id: string
  name: string
  description?: string
  ownerPrincipalId: string
  visibility: SpaceVisibility
  status: SpaceStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface SpaceMembership {
  spaceId: string
  principalId: string
  role: SpaceMembershipRole
  joinedAt: string
}

export interface SpacePresence {
  principalId: string
  spaceId: string
  enteredAt: string
}

export interface SpaceResourceRef {
  id: string
  spaceId: string
  resourceId: string
  addedByPrincipalId: string
  addedAt: string
}

export type ProjectionStatus = 'active' | 'suspended' | 'archived'
export type ProjectionMergePolicy = 'reviewed' | 'automatic' | 'none'

export interface Projection {
  id: string
  principalId: string
  rootPrincipalId: string
  spaceId: string
  role?: string
  status: ProjectionStatus
  permissionScope: string[]
  memoryScope: string[]
  mergePolicy: ProjectionMergePolicy
  createdAt: string
  updatedAt: string
  suspendedAt?: string
  archivedAt?: string
}

export interface ProjectionCheckpoint {
  id: string
  projectionId: string
  summary: string
  createdAt: string
}

export interface ProjectionMergeCandidate {
  id: string
  projectionId: string
  checkpointId?: string
  status: 'pending'
  createdAt: string
}

export type ContextSessionStatus = 'active' | 'closed'

export interface ContextSession {
  id: string
  principalId: string
  label: string
  status: ContextSessionStatus
  startedAt: string
  endedAt?: string
}

export type CapabilityMode = 'native' | 'api' | 'link'
export type CapabilityStatus = 'ready' | 'placeholder'

export interface CapabilityNavigation {
  visible: boolean
  order: number
}

export interface Capability {
  id: string
  label: string
  description: string
  route: string
  mode: CapabilityMode
  status: CapabilityStatus
  actions: string[]
  navigation?: CapabilityNavigation
}

export type ResourceType = 'game' | 'website' | 'research' | 'tool' | 'media'

export interface ExternalResource {
  id: string
  title: string
  type: ResourceType
  url: string
  createdAt: string
}

export type ActivityDomain = 'social' | 'research' | 'creative' | 'entertainment' | 'growth' | 'coordination'
export type ActivityExecutionMode = 'native' | 'external' | 'capability'
export type ActivityDefinitionStatus = 'ready' | 'draft' | 'retired'
export type ActivityFeedEmission = 'none' | 'summary' | 'important-only'

export interface ActivityPacingGuidance {
  suggestedSteps: number
  suggestedDurationMinutes?: number
}

export interface ActivityDefinition {
  id: string
  version: string
  label: string
  description: string
  domain: ActivityDomain
  executionMode: ActivityExecutionMode
  requiredPermissions: string[]
  requiresProjection: boolean
  allowedSpaceIds: string[]
  capabilityId?: string
  pacing: ActivityPacingGuidance
  status: ActivityDefinitionStatus
  feedEmission: ActivityFeedEmission
}

export type ActivityInstanceStatus = 'planned' | 'ready' | 'active' | 'suspended' | 'completed' | 'abandoned' | 'failed'

export interface ActivityInstance {
  id: string
  definitionId: string
  definitionVersion: string
  principalId: string
  rootPrincipalId: string
  projectionId?: string
  spaceId?: string
  status: ActivityInstanceStatus
  draft: Record<string, string>
  createdAt: string
  updatedAt: string
  readyAt?: string
  startedAt?: string
  suspendedAt?: string
  completedAt?: string
  abandonedAt?: string
  failedAt?: string
  resultSummary?: string
  terminalReason?: string
}

export type ActivityArtifactType = 'board-post' | 'experience' | 'resource' | 'field-note'

export interface ActivityArtifactRef {
  id: string
  activityInstanceId: string
  artifactType: ActivityArtifactType
  artifactId: string
  principalId: string
  createdAt: string
}

export interface ActivityAvailability {
  definitionId: string
  available: boolean
  reasons: string[]
}

export interface ActivityEvent {
  id: string
  timestamp: string
  principalId: string
  contextSessionId?: string
  projectionId?: string
  rootPrincipalId?: string
  spaceId?: string
  action: string
  capabilityId?: string
  resourceId?: string
  sessionId?: string
  activityInstanceId?: string
  summary: string
}


export interface BoardPost {
  id: string
  principalId: string
  title: string
  body: string
  createdAt: string
  contextSessionId?: string
  sourceSessionId?: string
  sourceResourceId?: string
}

export type BrowserSessionStatus = 'active' | 'completed' | 'abandoned'

export interface BrowserSession {
  id: string
  principalId: string
  projectionId: string
  rootPrincipalId: string
  spaceId: string
  contextSessionId?: string
  resourceId: string
  url: string
  status: BrowserSessionStatus
  trust: 'untrusted-external'
  isolation: 'noopener-noreferrer-only'
  startedAt: string
  endedAt?: string
  abandonReason?: string
}

export interface ExperienceRecord {
  id: string
  browserSessionId: string
  principalId: string
  projectionId: string
  rootPrincipalId: string
  spaceId: string
  contextSessionId?: string
  resourceId: string
  summary: string
  createdAt: string
  reflectionPostId?: string
}

export interface ExperienceReflectionCandidate {
  id: string
  experienceId: string
  status: 'pending' | 'promoted'
  createdAt: string
  promotedAt?: string
  postId?: string
}

export interface BrowserLaunchPlan {
  url: string
  target: '_blank'
  features: 'noopener,noreferrer'
  trust: 'untrusted-external'
  isolation: 'noopener-noreferrer-only'
  projectionId: string
  principalId: string
  rootPrincipalId: string
  spaceId: string
}

export type GameSessionStatus = 'active' | 'completed'

export interface GameSession {
  id: string
  principalId: string
  resourceId: string
  contextSessionId?: string
  status: GameSessionStatus
  startedAt: string
  endedAt?: string
  reflectionPostId?: string
}

export type CapabilityLifecycle = 'declared' | 'connected'
export type CapabilityHealth = 'unknown' | 'healthy' | 'degraded' | 'offline'

export interface CapabilityManifestNavigation {
  visible: boolean
  order: number
}

export interface CapabilityManifestSource {
  repository: string
}

export type CapabilityHttpMethod = 'GET' | 'POST'
export type CapabilityActionInputMode = 'query' | 'json' | 'none'

export interface CapabilityActionBinding {
  method: CapabilityHttpMethod
  path: string
  input: CapabilityActionInputMode
}

export interface CapabilityManifestRuntime {
  baseUrl?: string
  healthPath?: string
  actions?: Record<string, CapabilityActionBinding>
}

export interface CapabilityManifest {
  schemaVersion: '0.1'
  id: string
  name: string
  description: string
  version: string
  mode: CapabilityMode
  lifecycle: CapabilityLifecycle
  actions: string[]
  events: string[]
  permissions: string[]
  source: CapabilityManifestSource
  navigation?: CapabilityManifestNavigation
  route?: string
  externalUrl?: string
  runtime?: CapabilityManifestRuntime
}

export interface CapabilityProvider {
  manifest: CapabilityManifest
  health: CapabilityHealth
  observedVersion?: string
}

export interface CapabilityRuntimeState {
  capabilityId: string
  enabled: boolean
  health: CapabilityHealth
  lastProbeAt?: string
  lastInvokeAt?: string
  lastLatencyMs?: number
  lastSuccessAt?: string
  lastError?: string
}

export interface CapabilityRuntimeSnapshot {
  provider: CapabilityProvider
  state: CapabilityRuntimeState
}

export type CapabilityDispatchPlan =
  | { kind: 'link'; capabilityId: string; action: string; url: string }
  | { kind: 'native'; capabilityId: string; action: string; route: string }
  | { kind: 'api'; capabilityId: string; action: string; url: string; method: CapabilityHttpMethod; body?: unknown }
  | { kind: 'unavailable'; capabilityId: string; action: string; reason: string }

export type MvpJourneyStatus = 'active' | 'completed' | 'abandoned'

export interface MvpJourney {
  id: string
  label: string
  status: MvpJourneyStatus
  rootPrincipalId: string
  contextSessionId: string
  projectionId: string
  projectionPrincipalId: string
  spaceId: string
  capabilityId: string
  resourceId: string
  browserSessionId?: string
  experienceId?: string
  reflectionCandidateId?: string
  reflectionPostId?: string
  startedAt: string
  updatedAt: string
  completedAt?: string
  abandonedAt?: string
  abandonReason?: string
}

export type MvpJourneyStageKey =
  | 'principal'
  | 'context'
  | 'projection'
  | 'space'
  | 'capability'
  | 'interaction'
  | 'experience'
  | 'reflection'
  | 'return'

export type MvpJourneyStageStatus = 'pass' | 'pending' | 'fail'

export interface MvpJourneyStage {
  key: MvpJourneyStageKey
  status: MvpJourneyStageStatus
  label: string
  detail: string
}

export interface MvpJourneyEvaluation {
  journeyId: string
  coherent: boolean
  complete: boolean
  stages: MvpJourneyStage[]
  errors: string[]
}

export type AiSpaceAuditSeverity = 'error' | 'warning'

export interface AiSpaceAuditFinding {
  severity: AiSpaceAuditSeverity
  code: string
  entityType: string
  entityId?: string
  detail: string
}

export interface AiSpaceAuditReport {
  findings: AiSpaceAuditFinding[]
  errorCount: number
  warningCount: number
}

export interface AiSpaceCleanupResult {
  removedPresenceCount: number
  removedResourceRefCount: number
}

export type AiSpaceStateBundleSchemaVersion = '1.0' | '1.1' | '1.2'
export type AiSpaceStateChecksumAlgorithm = 'fnv1a32'

export interface AiSpaceStateBundleAuthority {
  lineageId: string
  revision: number
  parentChecksum: string | null
  stateFingerprint: string
}

export interface StateAuthorityRecord {
  schemaVersion: '1.0'
  lineageId: string
  revision: number
  headChecksum: string
  stateFingerprint: string
  updatedAt: string
}

export interface AiSpaceStateBundle {
  schemaVersion: AiSpaceStateBundleSchemaVersion
  appVersion: string
  createdAt: string
  checksumAlgorithm: AiSpaceStateChecksumAlgorithm
  checksum: string
  entries: Record<string, string | null>
  authority?: AiSpaceStateBundleAuthority
}

export interface AiSpaceStateRestorePreview {
  created: number
  changed: number
  cleared: number
  unchanged: number
}

export interface AiSpaceStateRestoreValidation {
  audit: AiSpaceAuditReport
}

export interface AiSpaceStateRestoreResult {
  preview: AiSpaceStateRestorePreview
  audit: AiSpaceAuditReport
}

export type AiSpaceStateMigrationRelation =
  | 'equal'
  | 'bootstrap'
  | 'fast-forward'
  | 'stale'
  | 'diverged'
  | 'foreign'
  | 'legacy'
  | 'untracked-local'

export interface AiSpaceStateMigrationAuthoritySummary {
  lineageId: string
  revision: number
  headChecksum: string
  stateFingerprint: string
}

export interface AiSpaceStateMigrationPlan {
  relation: AiSpaceStateMigrationRelation
  safeToApply: boolean
  reason: string
  candidateAuthority?: AiSpaceStateMigrationAuthoritySummary & { parentChecksum: string | null }
  localAuthority?: AiSpaceStateMigrationAuthoritySummary
}

export interface AiSpaceStateMigrationApplyResult {
  plan: AiSpaceStateMigrationPlan
  restore: AiSpaceStateRestoreResult
}
