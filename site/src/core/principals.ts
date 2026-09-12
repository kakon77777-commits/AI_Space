import type { Principal, PrincipalType } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const PRINCIPALS_KEY = 'ai-space.principals.v1'
const ACTIVE_PRINCIPAL_KEY = 'ai-space.active-principal.v1'
const DEFAULT_PRINCIPAL_ID = 'agent:local-demo'

export interface CreatePrincipalInput {
  type: Exclude<PrincipalType, 'projection'>
  displayName: string
  ownerId?: string
  provider?: string
  modelFamily?: string
  instanceId?: string
}

export interface CreateProjectionPrincipalInput {
  displayName: string
  rootPrincipalId: string
  provider?: string
  modelFamily?: string
  instanceId?: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function optionalTrim(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export class PrincipalStore {
  private readonly storage: StorageAdapter
  private readonly now: () => string
  private readonly createId: () => string

  constructor(
    storage: StorageAdapter,
    now: () => string = () => new Date().toISOString(),
    createId: () => string = defaultId,
  ) {
    this.storage = storage
    this.now = now
    this.createId = createId
  }

  ensureDefault(): Principal {
    const existing = this.get(DEFAULT_PRINCIPAL_ID)
    if (existing) {
      if (!this.storage.getItem(ACTIVE_PRINCIPAL_KEY)) this.storage.setItem(ACTIVE_PRINCIPAL_KEY, existing.id)
      return existing
    }

    const timestamp = this.now()
    const principal: Principal = {
      id: DEFAULT_PRINCIPAL_ID,
      type: 'agent',
      displayName: 'Local Demo Agent',
      provider: 'local',
      modelFamily: 'demo',
      instanceId: 'local-demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.write([...this.read(), principal])
    if (!this.storage.getItem(ACTIVE_PRINCIPAL_KEY)) this.storage.setItem(ACTIVE_PRINCIPAL_KEY, principal.id)
    return principal
  }

  create(input: CreatePrincipalInput): Principal {
    if ((input as { type?: string }).type === 'projection') {
      throw new Error('Projection principals must be created through Projection Runtime.')
    }
    const displayName = input.displayName.trim()
    if (!displayName) throw new Error('Principal display name is required.')

    const timestamp = this.now()
    const principal: Principal = {
      id: `${input.type}:${this.createId()}`,
      type: input.type,
      displayName,
      ownerId: optionalTrim(input.ownerId),
      provider: optionalTrim(input.provider),
      modelFamily: optionalTrim(input.modelFamily),
      instanceId: optionalTrim(input.instanceId),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.write([...this.read(), principal])
    return principal
  }

  createProjectionPrincipal(input: CreateProjectionPrincipalInput): Principal {
    const displayName = input.displayName.trim()
    if (!displayName) throw new Error('Principal display name is required.')
    const root = this.get(input.rootPrincipalId)
    if (!root) throw new Error('Root principal not found.')
    if (root.type === 'projection') throw new Error('Nested projections are not supported in v0.0.7.')

    const timestamp = this.now()
    const principal: Principal = {
      id: `projection:${this.createId()}`,
      type: 'projection',
      displayName,
      ownerId: root.id,
      provider: optionalTrim(input.provider),
      modelFamily: optionalTrim(input.modelFamily),
      instanceId: optionalTrim(input.instanceId),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.write([...this.read(), principal])
    return principal
  }

  list(): Principal[] {
    return [...this.read()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  }

  get(id: string): Principal | undefined {
    return this.read().find((principal) => principal.id === id)
  }

  getActive(): Principal {
    const fallback = this.ensureDefault()
    const activeId = this.storage.getItem(ACTIVE_PRINCIPAL_KEY)
    const active = activeId ? this.get(activeId) : undefined
    if (active) return active
    this.storage.setItem(ACTIVE_PRINCIPAL_KEY, fallback.id)
    return fallback
  }

  setActive(id: string): Principal {
    const principal = this.get(id)
    if (!principal) throw new Error('Principal not found.')
    this.storage.setItem(ACTIVE_PRINCIPAL_KEY, principal.id)
    return principal
  }

  private read(): Principal[] {
    const raw = this.storage.getItem(PRINCIPALS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(principals: Principal[]): void {
    this.storage.setItem(PRINCIPALS_KEY, JSON.stringify(principals))
  }
}
