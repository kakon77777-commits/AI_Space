import type {
  ActivityArtifactRef,
  ActivityArtifactType,
  ActivityAvailability,
  ActivityDefinition,
  ActivityInstance,
  Capability,
  Principal,
  Projection,
} from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'
import { projectionAllows } from './projections.ts'

export const ACTIVITY_INSTANCES_KEY = 'ai-space.activity-instances.v1'
export const ACTIVITY_ARTIFACT_REFS_KEY = 'ai-space.activity-artifact-refs.v1'

const ACTIVITY_INSTANCE_STATUSES = new Set<ActivityInstance['status']>(['planned', 'ready', 'active', 'suspended', 'completed', 'abandoned', 'failed'])
const NON_TERMINAL_ACTIVITY_STATUSES = new Set<ActivityInstance['status']>(['planned', 'ready', 'active', 'suspended'])
const ACTIVITY_ARTIFACT_TYPES = new Set<ActivityArtifactType>(['board-post', 'experience', 'resource', 'field-note'])

export interface ActivityStateFinding {
  code: string
  entityType: 'activity-instance' | 'activity-artifact-ref' | 'activity-instance-state' | 'activity-artifact-state'
  entityId?: string
  detail: string
}

export interface ActivityStateInspection<T> {
  records: T[]
  findings: ActivityStateFinding[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readableEntityId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function inspectActivityInstances(input: unknown): ActivityStateInspection<ActivityInstance> {
  if (!Array.isArray(input)) {
    return {
      records: [],
      findings: [{
        code: 'activity-instance-state-not-array',
        entityType: 'activity-instance-state',
        detail: 'Activity instance state must be an array.',
      }],
    }
  }

  const records: ActivityInstance[] = []
  const findings: ActivityStateFinding[] = []
  const ids = new Set<string>()
  const nonTerminalOwners = new Map<string, string>()
  const requiredStrings = ['id', 'definitionId', 'definitionVersion', 'principalId', 'rootPrincipalId', 'createdAt', 'updatedAt'] as const
  const optionalStrings = ['projectionId', 'spaceId', 'readyAt', 'startedAt', 'suspendedAt', 'completedAt', 'abandonedAt', 'failedAt', 'resultSummary', 'terminalReason'] as const

  for (const [index, value] of input.entries()) {
    if (!isRecord(value)) {
      findings.push({
        code: 'activity-instance-shape-invalid',
        entityType: 'activity-instance',
        detail: `Activity instance at index ${index} must be an object.`,
      })
      continue
    }

    const entityId = readableEntityId(value.id)
    let valid = true
    const reject = (code: string, detail: string) => {
      findings.push({ code, entityType: 'activity-instance', ...(entityId ? { entityId } : {}), detail })
      valid = false
    }

    for (const field of requiredStrings) {
      if (typeof value[field] !== 'string' || !value[field].trim()) reject('activity-instance-field-invalid', `Activity instance ${field} must be a non-empty string.`)
    }
    for (const field of optionalStrings) {
      if (value[field] !== undefined && (typeof value[field] !== 'string' || !value[field].trim())) reject('activity-instance-field-invalid', `Activity instance ${field} must be a non-empty string when present.`)
    }

    if (entityId) {
      if (ids.has(entityId)) reject('activity-instance-id-duplicate', `Activity instance id ${entityId} is duplicated.`)
      ids.add(entityId)
    }

    const status = value.status
    if (typeof status !== 'string' || !ACTIVITY_INSTANCE_STATUSES.has(status as ActivityInstance['status'])) {
      reject('activity-instance-status-invalid', `Activity instance status ${String(status)} is unsupported.`)
    }

    if (!isRecord(value.draft) || Object.entries(value.draft).some(([key, draftValue]) => !key.trim() || typeof draftValue !== 'string')) {
      reject('activity-instance-draft-invalid', 'Activity instance draft must be a non-null object with non-empty keys and string values.')
    }

    if (typeof status === 'string' && ACTIVITY_INSTANCE_STATUSES.has(status as ActivityInstance['status'])) {
      const has = (field: string) => typeof value[field] === 'string' && Boolean(value[field].trim())
      const missing: string[] = []
      if (status === 'ready' && !has('readyAt')) missing.push('readyAt')
      if ((status === 'active' || status === 'suspended' || status === 'completed') && !has('readyAt')) missing.push('readyAt')
      if ((status === 'active' || status === 'suspended' || status === 'completed') && !has('startedAt')) missing.push('startedAt')
      if (status === 'suspended' && !has('suspendedAt')) missing.push('suspendedAt')
      if (status === 'completed' && !has('completedAt')) missing.push('completedAt')
      if (status === 'completed' && !has('resultSummary')) missing.push('resultSummary')
      if (status === 'abandoned' && !has('abandonedAt')) missing.push('abandonedAt')
      if (status === 'abandoned' && !has('terminalReason')) missing.push('terminalReason')
      if (status === 'failed' && !has('failedAt')) missing.push('failedAt')
      if (status === 'failed' && !has('terminalReason')) missing.push('terminalReason')
      if (status === 'active' && has('suspendedAt')) reject('activity-instance-lifecycle-invalid', 'Active Activity instance must not retain suspendedAt.')
      if (missing.length > 0) reject('activity-instance-lifecycle-invalid', `Activity instance status ${status} requires: ${missing.join(', ')}.`)

      if (NON_TERMINAL_ACTIVITY_STATUSES.has(status as ActivityInstance['status'])) {
        const definitionId = readableEntityId(value.definitionId)
        const rootPrincipalId = readableEntityId(value.rootPrincipalId)
        if (definitionId && rootPrincipalId) {
          const ownershipKey = `${rootPrincipalId}\u0000${definitionId}`
          const first = nonTerminalOwners.get(ownershipKey)
          if (first) reject('activity-instance-non-terminal-duplicate', `Root Principal already has non-terminal Activity work for this definition (${first}).`)
          else nonTerminalOwners.set(ownershipKey, entityId ?? `index:${index}`)
        }
      }
    }

    if (valid) records.push(value as unknown as ActivityInstance)
  }

  return { records, findings }
}

export function inspectActivityArtifacts(input: unknown): ActivityStateInspection<ActivityArtifactRef> {
  if (!Array.isArray(input)) {
    return {
      records: [],
      findings: [{
        code: 'activity-artifact-state-not-array',
        entityType: 'activity-artifact-state',
        detail: 'Activity artifact state must be an array.',
      }],
    }
  }

  const records: ActivityArtifactRef[] = []
  const findings: ActivityStateFinding[] = []
  const ids = new Set<string>()
  const requiredStrings = ['id', 'activityInstanceId', 'artifactId', 'principalId', 'createdAt'] as const
  for (const [index, value] of input.entries()) {
    if (!isRecord(value)) {
      findings.push({
        code: 'activity-artifact-shape-invalid',
        entityType: 'activity-artifact-ref',
        detail: `Activity artifact reference at index ${index} must be an object.`,
      })
      continue
    }

    const entityId = readableEntityId(value.id)
    let valid = true
    const reject = (code: string, detail: string) => {
      findings.push({ code, entityType: 'activity-artifact-ref', ...(entityId ? { entityId } : {}), detail })
      valid = false
    }
    for (const field of requiredStrings) {
      if (typeof value[field] !== 'string' || !value[field].trim()) reject('activity-artifact-field-invalid', `Activity artifact ${field} must be a non-empty string.`)
    }
    if (entityId) {
      if (ids.has(entityId)) reject('activity-artifact-id-duplicate', `Activity artifact id ${entityId} is duplicated.`)
      ids.add(entityId)
    }
    if (typeof value.artifactType !== 'string' || !ACTIVITY_ARTIFACT_TYPES.has(value.artifactType as ActivityArtifactType)) {
      reject('activity-artifact-type-invalid', `Activity artifact type ${String(value.artifactType)} is unsupported.`)
    }
    if (valid) records.push(value as unknown as ActivityArtifactRef)
  }
  return { records, findings }
}

function readJsonState(storage: StorageAdapter, key: string, label: string): unknown {
  const raw = storage.getItem(key)
  if (raw === null) return []
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${label} is invalid: JSON could not be parsed.`)
  }
}

function requireValidState<T>(inspection: ActivityStateInspection<T>, label: string): T[] {
  if (inspection.findings.length > 0) {
    throw new Error(`${label} is invalid: ${inspection.findings.map((finding) => finding.code).join(', ')}`)
  }
  return inspection.records
}

export interface ActivityContext {
  principal: Principal
  projection?: Projection
  space?: { id: string }
  capabilities: Capability[]
}

export interface CreateActivityInstanceInput {
  definitionId: string
  definitionVersion: string
  principalId: string
  rootPrincipalId: string
  projectionId?: string
  spaceId?: string
}

export interface AddActivityArtifactInput {
  activityInstanceId: string
  artifactType: ActivityArtifactType
  artifactId: string
  principalId: string
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}:${crypto.randomUUID()}`
  return `${prefix}:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function required(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  return trimmed
}

function permissionParts(permission: string): { capabilityId: string; action: string } | undefined {
  const separator = permission.lastIndexOf(':')
  if (separator <= 0 || separator === permission.length - 1) return undefined
  return { capabilityId: permission.slice(0, separator), action: permission.slice(separator + 1) }
}

export function activityTargetOpenedDraftKey(target: 'human' | 'aiNative'): 'humanOpenedAt' | 'aiOpenedAt' {
  return target === 'human' ? 'humanOpenedAt' : 'aiOpenedAt'
}

function validateDefinition(definition: ActivityDefinition): ActivityDefinition {
  required(definition.id, 'ActivityDefinition id')
  required(definition.version, 'ActivityDefinition version')
  required(definition.label, 'ActivityDefinition label')
  required(definition.description, 'ActivityDefinition description')
  if (!Number.isInteger(definition.pacing.suggestedSteps) || definition.pacing.suggestedSteps < 1) throw new Error(`ActivityDefinition ${definition.id} pacing.suggestedSteps must be a positive integer.`)
  if (definition.pacing.suggestedDurationMinutes !== undefined && (!Number.isInteger(definition.pacing.suggestedDurationMinutes) || definition.pacing.suggestedDurationMinutes < 1)) {
    throw new Error(`ActivityDefinition ${definition.id} pacing.suggestedDurationMinutes must be a positive integer.`)
  }
  if (new Set(definition.requiredPermissions).size !== definition.requiredPermissions.length) throw new Error(`ActivityDefinition ${definition.id} has duplicate permissions.`)
  if (definition.requiredPermissions.some((permission) => !permissionParts(permission))) throw new Error(`ActivityDefinition ${definition.id} has an invalid permission.`)
  return definition
}

export class ActivityCatalog {
  private readonly definitions: ActivityDefinition[]

  constructor(definitions: ActivityDefinition[]) {
    const ids = new Set<string>()
    this.definitions = definitions.map((definition) => {
      validateDefinition(definition)
      if (ids.has(definition.id)) throw new Error(`Duplicate ActivityDefinition id: ${definition.id}`)
      ids.add(definition.id)
      return structuredClone(definition)
    })
  }

  list(): ActivityDefinition[] {
    return this.definitions.map((definition) => structuredClone(definition))
  }

  get(id: string): ActivityDefinition | undefined {
    const definition = this.definitions.find((item) => item.id === id)
    return definition ? structuredClone(definition) : undefined
  }

  require(id: string): ActivityDefinition {
    const definition = this.get(id)
    if (!definition) throw new Error(`ActivityDefinition not found: ${id}`)
    return definition
  }
}

export function evaluateActivityAvailability(definition: ActivityDefinition, context: ActivityContext): ActivityAvailability {
  const reasons: string[] = []
  if (definition.status !== 'ready') reasons.push(`Activity is ${definition.status}.`)

  const projection = context.projection
  if (definition.requiresProjection) {
    if (!projection) reasons.push('An active Projection is required.')
    else {
      if (projection.status !== 'active') reasons.push(`Projection is ${projection.status}.`)
      if (projection.rootPrincipalId !== context.principal.id) reasons.push('Projection does not belong to the active Root Principal.')
    }
  }

  if (definition.requiredPermissions.length > 0) {
    if (!projection) reasons.push('Projection permissions are required.')
    else for (const permission of definition.requiredPermissions) {
      const parts = permissionParts(permission)
      if (!parts || !projectionAllows(projection, parts.capabilityId, parts.action)) reasons.push(`Missing permission: ${permission}`)
    }
  }

  const effectiveSpaceId = projection?.spaceId ?? context.space?.id
  if (definition.allowedSpaceIds.length > 0 && (!effectiveSpaceId || !definition.allowedSpaceIds.includes(effectiveSpaceId))) {
    reasons.push(`Activity requires one of these Spaces: ${definition.allowedSpaceIds.join(', ')}`)
  }

  if (definition.capabilityId) {
    const capability = context.capabilities.find((item) => item.id === definition.capabilityId)
    if (!capability) reasons.push(`Capability is missing: ${definition.capabilityId}`)
    else if (capability.status !== 'ready') reasons.push(`Capability is not ready: ${definition.capabilityId}`)
  }

  return { definitionId: definition.id, available: reasons.length === 0, reasons }
}

export class ActivityInstanceStore {
  private readonly storage: StorageAdapter
  private readonly now: () => string
  private readonly createId: () => string

  constructor(
    storage: StorageAdapter,
    now: () => string = () => new Date().toISOString(),
    createId: () => string = () => makeId('activity-instance'),
  ) {
    this.storage = storage
    this.now = now
    this.createId = createId
  }

  create(input: CreateActivityInstanceInput): ActivityInstance {
    const timestamp = this.now()
    const instance: ActivityInstance = {
      id: this.createId(),
      definitionId: required(input.definitionId, 'ActivityDefinition id'),
      definitionVersion: required(input.definitionVersion, 'ActivityDefinition version'),
      principalId: required(input.principalId, 'Activity Principal id'),
      rootPrincipalId: required(input.rootPrincipalId, 'Activity Root Principal id'),
      ...(input.projectionId ? { projectionId: required(input.projectionId, 'Activity Projection id') } : {}),
      ...(input.spaceId ? { spaceId: required(input.spaceId, 'Activity Space id') } : {}),
      status: 'planned',
      draft: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.write([...this.read(), instance])
    return instance
  }

  list(): ActivityInstance[] {
    return [...this.read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  }

  get(id: string): ActivityInstance | undefined {
    return this.read().find((item) => item.id === id)
  }

  markReady(id: string): ActivityInstance {
    const current = this.requireStatus(id, 'planned')
    const timestamp = this.now()
    return this.replace(id, { ...current, status: 'ready', readyAt: timestamp, updatedAt: timestamp })
  }

  start(id: string): ActivityInstance {
    const current = this.requireStatus(id, 'ready')
    const timestamp = this.now()
    return this.replace(id, { ...current, status: 'active', startedAt: timestamp, updatedAt: timestamp })
  }

  suspend(id: string): ActivityInstance {
    const current = this.requireStatus(id, 'active')
    const timestamp = this.now()
    return this.replace(id, { ...current, status: 'suspended', suspendedAt: timestamp, updatedAt: timestamp })
  }

  resume(id: string): ActivityInstance {
    const current = this.requireStatus(id, 'suspended')
    const timestamp = this.now()
    const { suspendedAt: _suspendedAt, ...rest } = current
    return this.replace(id, { ...rest, status: 'active', updatedAt: timestamp })
  }

  updateDraft(id: string, patch: Record<string, string>): ActivityInstance {
    const current = this.requireNonTerminal(id)
    if (current.status !== 'active' && current.status !== 'suspended') throw new Error('Activity draft can only change after the Activity starts.')
    const draft = { ...current.draft }
    for (const [key, value] of Object.entries(patch)) {
      if (!key.trim()) throw new Error('Activity draft key is required.')
      draft[key] = value
    }
    return this.replace(id, { ...current, draft, updatedAt: this.now() })
  }

  complete(id: string, resultSummaryRaw: string, requiredDraftKeys: string[] = []): ActivityInstance {
    const current = this.requireStatus(id, 'active')
    for (const key of requiredDraftKeys) if (!current.draft[key]?.trim()) throw new Error(`Activity draft field is required: ${key}`)
    const timestamp = this.now()
    return this.replace(id, {
      ...current,
      status: 'completed',
      resultSummary: required(resultSummaryRaw, 'Activity result summary'),
      completedAt: timestamp,
      updatedAt: timestamp,
    })
  }

  abandon(id: string, reasonRaw = 'abandoned'): ActivityInstance {
    const current = this.requireNonTerminal(id)
    const timestamp = this.now()
    return this.replace(id, { ...current, status: 'abandoned', terminalReason: reasonRaw.trim() || 'abandoned', abandonedAt: timestamp, updatedAt: timestamp })
  }

  fail(id: string, reasonRaw: string): ActivityInstance {
    const current = this.requireNonTerminal(id)
    const timestamp = this.now()
    return this.replace(id, { ...current, status: 'failed', terminalReason: required(reasonRaw, 'Activity failure reason'), failedAt: timestamp, updatedAt: timestamp })
  }

  hasNonTerminal(definitionId: string, rootPrincipalId: string): boolean {
    return this.read().some((item) => item.definitionId === definitionId && item.rootPrincipalId === rootPrincipalId && NON_TERMINAL_ACTIVITY_STATUSES.has(item.status))
  }

  private requireNonTerminal(id: string): ActivityInstance {
    const current = this.get(id)
    if (!current) throw new Error('ActivityInstance not found.')
    if (!NON_TERMINAL_ACTIVITY_STATUSES.has(current.status)) throw new Error('ActivityInstance is terminal.')
    return current
  }

  private requireStatus(id: string, status: ActivityInstance['status']): ActivityInstance {
    const current = this.get(id)
    if (!current) throw new Error('ActivityInstance not found.')
    if (!NON_TERMINAL_ACTIVITY_STATUSES.has(current.status)) throw new Error('ActivityInstance is terminal.')
    if (current.status !== status) throw new Error(`ActivityInstance must be ${status}; current status is ${current.status}.`)
    return current
  }

  private replace(id: string, next: ActivityInstance): ActivityInstance {
    const items = this.read()
    const index = items.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('ActivityInstance not found.')
    items[index] = next
    this.write(items)
    return next
  }

  private read(): ActivityInstance[] {
    return requireValidState(
      inspectActivityInstances(readJsonState(this.storage, ACTIVITY_INSTANCES_KEY, 'Activity state')),
      'Activity state',
    )
  }

  private write(items: ActivityInstance[]): void {
    this.storage.setItem(ACTIVITY_INSTANCES_KEY, JSON.stringify(items))
  }
}

export class ActivityArtifactRefStore {
  private readonly storage: StorageAdapter
  private readonly instances: ActivityInstanceStore
  private readonly now: () => string
  private readonly createId: () => string

  constructor(
    storage: StorageAdapter,
    instances: ActivityInstanceStore,
    now: () => string = () => new Date().toISOString(),
    createId: () => string = () => makeId('activity-artifact'),
  ) {
    this.storage = storage
    this.instances = instances
    this.now = now
    this.createId = createId
  }

  add(input: AddActivityArtifactInput): ActivityArtifactRef {
    const instance = this.instances.get(input.activityInstanceId)
    if (!instance) throw new Error('ActivityInstance not found for artifact reference.')
    const artifactId = required(input.artifactId, 'Activity artifact id')
    const duplicate = this.list().some((item) => item.activityInstanceId === instance.id && item.artifactType === input.artifactType && item.artifactId === artifactId)
    if (duplicate) throw new Error('Activity artifact is already linked.')
    const ref: ActivityArtifactRef = {
      id: this.createId(),
      activityInstanceId: instance.id,
      artifactType: input.artifactType,
      artifactId,
      principalId: required(input.principalId, 'Activity artifact Principal id'),
      createdAt: this.now(),
    }
    this.storage.setItem(ACTIVITY_ARTIFACT_REFS_KEY, JSON.stringify([...this.read(), ref]))
    return ref
  }

  list(): ActivityArtifactRef[] {
    return [...this.read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  }

  forActivity(activityInstanceId: string): ActivityArtifactRef[] {
    return this.list().filter((item) => item.activityInstanceId === activityInstanceId)
  }

  private read(): ActivityArtifactRef[] {
    return requireValidState(
      inspectActivityArtifacts(readJsonState(this.storage, ACTIVITY_ARTIFACT_REFS_KEY, 'Activity artifact state')),
      'Activity artifact state',
    )
  }
}

export class ActivityRuntime {
  readonly catalog: ActivityCatalog
  readonly instances: ActivityInstanceStore
  readonly artifacts: ActivityArtifactRefStore

  constructor(
    catalog: ActivityCatalog,
    instances: ActivityInstanceStore,
    artifacts: ActivityArtifactRefStore,
  ) {
    this.catalog = catalog
    this.instances = instances
    this.artifacts = artifacts
  }

  availability(definitionId: string, context: ActivityContext): ActivityAvailability {
    return evaluateActivityAvailability(this.catalog.require(definitionId), context)
  }

  listAvailability(context: ActivityContext): ActivityAvailability[] {
    return this.catalog.list().map((definition) => evaluateActivityAvailability(definition, context))
  }

  plan(definitionId: string, context: ActivityContext): ActivityInstance {
    const definition = this.catalog.require(definitionId)
    const availability = evaluateActivityAvailability(definition, context)
    if (!availability.available) throw new Error(`Activity unavailable: ${availability.reasons.join(' ')}`)
    const rootPrincipalId = context.projection?.rootPrincipalId ?? context.principal.id
    if (this.instances.hasNonTerminal(definition.id, rootPrincipalId)) throw new Error('Root Principal already has non-terminal work for this ActivityDefinition.')
    const created = this.instances.create({
      definitionId: definition.id,
      definitionVersion: definition.version,
      principalId: context.projection?.principalId ?? context.principal.id,
      rootPrincipalId,
      ...(context.projection ? { projectionId: context.projection.id, spaceId: context.projection.spaceId } : context.space ? { spaceId: context.space.id } : {}),
    })
    return this.instances.markReady(created.id)
  }

  start(id: string): ActivityInstance { return this.instances.start(id) }
  suspend(id: string): ActivityInstance { return this.instances.suspend(id) }
  resume(id: string): ActivityInstance { return this.instances.resume(id) }
  updateDraft(id: string, patch: Record<string, string>): ActivityInstance { return this.instances.updateDraft(id, patch) }
  complete(id: string, resultSummary: string, requiredDraftKeys: string[] = []): ActivityInstance { return this.instances.complete(id, resultSummary, requiredDraftKeys) }
  abandon(id: string, reason?: string): ActivityInstance { return this.instances.abandon(id, reason) }
  fail(id: string, reason: string): ActivityInstance { return this.instances.fail(id, reason) }
}
