import type {
  Projection,
  ProjectionCheckpoint,
  ProjectionMergeCandidate,
  ProjectionMergePolicy,
} from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'
import type { SpaceStore } from './spaces.ts'
import { assertProjectionSpacePresence } from './spaces.ts'
import { PrincipalStore } from './principals.ts'

const PROJECTIONS_KEY = 'ai-space.projections.v1'
const CHECKPOINTS_KEY = 'ai-space.projection-checkpoints.v1'
const MERGE_CANDIDATES_KEY = 'ai-space.projection-merge-candidates.v1'

export interface CreateProjectionInput {
  rootPrincipalId: string
  spaceId: string
  displayName?: string
  role?: string
  permissionScope?: string[]
  memoryScope?: string[]
  mergePolicy?: ProjectionMergePolicy
}

function defaultProjectionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `proj:${crypto.randomUUID()}`
  return `proj:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultCheckpointId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `checkpoint:${crypto.randomUUID()}`
  return `checkpoint:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultMergeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `merge:${crypto.randomUUID()}`
  return `merge:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function optionalTrim(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeScope(values?: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of values ?? []) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function readArray<T>(storage: StorageAdapter, key: string): T[] {
  const raw = storage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function projectionAllows(projection: Projection, capabilityId: string, action: string): boolean {
  if (projection.status !== 'active') return false
  const exact = `${capabilityId}:${action}`
  const capabilityWildcard = `${capabilityId}:*`
  return projection.permissionScope.includes('*:*')
    || projection.permissionScope.includes(capabilityWildcard)
    || projection.permissionScope.includes(exact)
}


export function projectionEventLineage(projection?: Projection): Pick<Projection, never> & {
  projectionId?: string
  rootPrincipalId?: string
  spaceId?: string
} {
  if (!projection) return {}
  return {
    projectionId: projection.id,
    rootPrincipalId: projection.rootPrincipalId,
    spaceId: projection.spaceId,
  }
}

export async function invokeWithProjectionPermission<T>(
  projection: Projection | undefined,
  capabilityId: string,
  action: string,
  invoke: () => Promise<T>,
): Promise<T> {
  if (projection && !projectionAllows(projection, capabilityId, action)) {
    throw new Error(`Projection permission denied: ${capabilityId}:${action}`)
  }
  return invoke()
}


export function assertProjectionRuntimeAccess(
  spaces: SpaceStore,
  projection: Projection | undefined,
  capabilityId: string,
  action: string,
): void {
  if (!projection) return
  if (projection.status !== 'active') throw new Error('An active Projection is required for runtime access.')
  if (!projectionAllows(projection, capabilityId, action)) {
    throw new Error(`Projection permission denied: ${capabilityId}:${action}`)
  }
  assertProjectionSpacePresence(spaces, projection)
}

export async function invokeWithProjectionRuntimeAccess<T>(
  spaces: SpaceStore,
  projection: Projection | undefined,
  capabilityId: string,
  action: string,
  invoke: () => Promise<T>,
): Promise<T> {
  assertProjectionRuntimeAccess(spaces, projection, capabilityId, action)
  return invoke()
}

export class ProjectionStore {
  private readonly storage: StorageAdapter
  private readonly principals: PrincipalStore
  private readonly now: () => string
  private readonly createProjectionId: () => string
  private readonly createCheckpointId: () => string
  private readonly createMergeId: () => string

  constructor(
    storage: StorageAdapter,
    principals: PrincipalStore,
    now: () => string = () => new Date().toISOString(),
    createProjectionId: () => string = defaultProjectionId,
    createCheckpointId: () => string = defaultCheckpointId,
    createMergeId: () => string = defaultMergeId,
  ) {
    this.storage = storage
    this.principals = principals
    this.now = now
    this.createProjectionId = createProjectionId
    this.createCheckpointId = createCheckpointId
    this.createMergeId = createMergeId
  }

  create(input: CreateProjectionInput): Projection {
    const root = this.principals.get(input.rootPrincipalId)
    if (!root) throw new Error('Root principal not found.')
    if (root.type === 'projection') throw new Error('Nested projections are not supported in v0.0.7.')

    const spaceId = input.spaceId.trim()
    if (!spaceId) throw new Error('Space ID is required.')

    const displayName = optionalTrim(input.displayName) ?? `${root.displayName} · ${spaceId}`
    const principal = this.principals.createProjectionPrincipal({
      displayName,
      rootPrincipalId: root.id,
      provider: root.provider,
      modelFamily: root.modelFamily,
      instanceId: `projection:${spaceId}`,
    })

    const timestamp = this.now()
    const projection: Projection = {
      id: this.createProjectionId(),
      principalId: principal.id,
      rootPrincipalId: root.id,
      spaceId,
      role: optionalTrim(input.role),
      status: 'active',
      permissionScope: normalizeScope(input.permissionScope),
      memoryScope: normalizeScope(input.memoryScope),
      mergePolicy: input.mergePolicy ?? 'reviewed',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.writeProjections([...this.readProjections(), projection])
    return projection
  }

  suspend(id: string): Projection {
    return this.transition(id, 'suspend')
  }

  resume(id: string): Projection {
    return this.transition(id, 'resume')
  }

  archive(id: string): Projection {
    return this.transition(id, 'archive')
  }

  checkpoint(projectionId: string, summaryRaw: string): ProjectionCheckpoint {
    const projection = this.get(projectionId)
    if (!projection) throw new Error('Projection not found.')
    const summary = summaryRaw.trim()
    if (!summary) throw new Error('Checkpoint summary is required.')

    const checkpoint: ProjectionCheckpoint = {
      id: this.createCheckpointId(),
      projectionId,
      summary,
      createdAt: this.now(),
    }
    const current = readArray<ProjectionCheckpoint>(this.storage, CHECKPOINTS_KEY)
    this.storage.setItem(CHECKPOINTS_KEY, JSON.stringify([...current, checkpoint]))
    return checkpoint
  }

  createMergeCandidate(projectionId: string, checkpointId?: string): ProjectionMergeCandidate {
    const projection = this.get(projectionId)
    if (!projection) throw new Error('Projection not found.')

    if (checkpointId) {
      const checkpoint = this.checkpoints().find((item) => item.id === checkpointId)
      if (!checkpoint) throw new Error('Checkpoint not found.')
      if (checkpoint.projectionId !== projectionId) throw new Error('Checkpoint does not belong to this projection.')
    }

    const candidate: ProjectionMergeCandidate = {
      id: this.createMergeId(),
      projectionId,
      checkpointId,
      status: 'pending',
      createdAt: this.now(),
    }
    const current = readArray<ProjectionMergeCandidate>(this.storage, MERGE_CANDIDATES_KEY)
    this.storage.setItem(MERGE_CANDIDATES_KEY, JSON.stringify([...current, candidate]))
    return candidate
  }

  list(): Projection[] {
    return [...this.readProjections()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  }

  get(id: string): Projection | undefined {
    return this.readProjections().find((projection) => projection.id === id)
  }

  getByPrincipalId(principalId: string): Projection | undefined {
    return this.readProjections().find((projection) => projection.principalId === principalId)
  }

  listForRoot(rootPrincipalId: string): Projection[] {
    return this.list().filter((projection) => projection.rootPrincipalId === rootPrincipalId)
  }

  checkpoints(projectionId?: string): ProjectionCheckpoint[] {
    const all = readArray<ProjectionCheckpoint>(this.storage, CHECKPOINTS_KEY)
    return all
      .filter((item) => !projectionId || item.projectionId === projectionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  mergeCandidates(projectionId?: string): ProjectionMergeCandidate[] {
    const all = readArray<ProjectionMergeCandidate>(this.storage, MERGE_CANDIDATES_KEY)
    return all
      .filter((item) => !projectionId || item.projectionId === projectionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  private transition(id: string, action: 'suspend' | 'resume' | 'archive'): Projection {
    const projections = this.readProjections()
    const index = projections.findIndex((projection) => projection.id === id)
    if (index < 0) throw new Error('Projection not found.')
    const current = projections[index]
    if (current.status === 'archived') {
      if (action === 'archive') throw new Error('Projection is already archived.')
      throw new Error('Archived projection is terminal.')
    }

    if (action === 'suspend') {
      if (current.status === 'suspended') throw new Error('Projection is already suspended.')
      const timestamp = this.now()
      projections[index] = { ...current, status: 'suspended', suspendedAt: timestamp, updatedAt: timestamp }
    } else if (action === 'resume') {
      if (current.status === 'active') throw new Error('Projection is already active.')
      const timestamp = this.now()
      const { suspendedAt: _suspendedAt, ...rest } = current
      projections[index] = { ...rest, status: 'active', updatedAt: timestamp }
    } else {
      const timestamp = this.now()
      projections[index] = { ...current, status: 'archived', archivedAt: timestamp, updatedAt: timestamp }
    }

    this.writeProjections(projections)
    return projections[index]
  }

  private readProjections(): Projection[] {
    return readArray<Projection>(this.storage, PROJECTIONS_KEY)
  }

  private writeProjections(projections: Projection[]): void {
    this.storage.setItem(PROJECTIONS_KEY, JSON.stringify(projections))
  }
}
