import type {
  ActivityEvent,
  Projection,
  Space,
  SpaceMembership,
  SpacePresence,
  SpaceResourceRef,
  SpaceVisibility,
  ExternalResource,
  AiSpaceCleanupResult,
} from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'
import { PrincipalStore } from './principals.ts'

const SPACES_KEY = 'ai-space.spaces.v1'
const MEMBERSHIPS_KEY = 'ai-space.space-memberships.v1'
const PRESENCES_KEY = 'ai-space.space-presences.v1'
const RESOURCE_REFS_KEY = 'ai-space.space-resource-refs.v1'

export interface CreateSpaceInput {
  ownerPrincipalId: string
  name: string
  description?: string
  visibility: SpaceVisibility
}

const BUILT_INS = [
  ['research', 'Research'],
  ['arcade', 'Arcade'],
  ['board', 'Board'],
  ['library', 'Library'],
] as const

function defaultSpaceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `space:${crypto.randomUUID()}`
  return `space:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultRefId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `space-ref:${crypto.randomUUID()}`
  return `space-ref:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function optionalTrim(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
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

export function selectSpaceEvents(events: ActivityEvent[], spaceId: string): ActivityEvent[] {
  return events.filter((event) => event.spaceId === spaceId)
}

export function assertProjectionSpaceBinding(spaces: SpaceStore, rootPrincipalId: string, spaceId: string): Space {
  const space = spaces.get(spaceId)
  if (!space) throw new Error('Space not found.')
  if (space.status !== 'active') throw new Error('Projection cannot bind to an archived Space.')
  if (!spaces.isMember(space.id, rootPrincipalId)) throw new Error('Projection Root Principal must be a Space member.')
  return space
}

export function assertProjectionSpacePresence(spaces: SpaceStore, projection: Projection): SpacePresence {
  const presence = spaces.getActivePresence(projection.principalId)
  if (!presence || presence.spaceId !== projection.spaceId) {
    throw new Error('Projection must be entered into its bound Space.')
  }
  return presence
}

export class SpaceStore {
  private readonly storage: StorageAdapter
  private readonly principals: PrincipalStore
  private readonly now: () => string
  private readonly createSpaceId: () => string
  private readonly createRefId: () => string

  constructor(
    storage: StorageAdapter,
    principals: PrincipalStore,
    now: () => string = () => new Date().toISOString(),
    createSpaceId: () => string = defaultSpaceId,
    createRefId: () => string = defaultRefId,
  ) {
    this.storage = storage
    this.principals = principals
    this.now = now
    this.createSpaceId = createSpaceId
    this.createRefId = createRefId
  }

  ensureBuiltIns(ownerPrincipalId: string): Space[] {
    const owner = this.requireRootPrincipal(ownerPrincipalId, 'Owner')
    const spaces = this.readSpaces()
    const memberships = this.readMemberships()
    const timestamp = this.now()
    let changedSpaces = false
    let changedMemberships = false

    for (const [id, name] of BUILT_INS) {
      let space = spaces.find((item) => item.id === id)
      if (!space) {
        space = {
          id,
          name,
          ownerPrincipalId: owner.id,
          visibility: 'shared',
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        spaces.push(space)
        changedSpaces = true
      }
      if (!memberships.some((membership) => membership.spaceId === id && membership.principalId === space.ownerPrincipalId)) {
        memberships.push({ spaceId: id, principalId: space.ownerPrincipalId, role: 'owner', joinedAt: space.createdAt })
        changedMemberships = true
      }
    }

    if (changedSpaces) this.writeSpaces(spaces)
    if (changedMemberships) this.writeMemberships(memberships)
    return this.list().filter((space) => BUILT_INS.some(([id]) => id === space.id))
  }

  create(input: CreateSpaceInput): Space {
    const owner = this.requireRootPrincipal(input.ownerPrincipalId, 'Owner')
    const name = input.name.trim()
    if (!name) throw new Error('Space name is required.')
    const timestamp = this.now()
    const space: Space = {
      id: this.createSpaceId(),
      name,
      description: optionalTrim(input.description),
      ownerPrincipalId: owner.id,
      visibility: input.visibility,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.writeSpaces([...this.readSpaces(), space])
    this.writeMemberships([...this.readMemberships(), {
      spaceId: space.id,
      principalId: owner.id,
      role: 'owner',
      joinedAt: timestamp,
    }])
    return space
  }

  list(): Space[] {
    return [...this.readSpaces()].sort((a, b) => a.id.localeCompare(b.id))
  }

  get(id: string): Space | undefined {
    return this.readSpaces().find((space) => space.id === id)
  }

  memberships(spaceId: string): SpaceMembership[] {
    return this.readMemberships()
      .filter((membership) => membership.spaceId === spaceId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.principalId.localeCompare(b.principalId))
  }

  allMemberships(): SpaceMembership[] {
    return [...this.readMemberships()]
  }

  isMember(spaceId: string, principalId: string): boolean {
    return this.readMemberships().some((membership) => membership.spaceId === spaceId && membership.principalId === principalId)
  }

  addMember(spaceId: string, principalId: string, actorPrincipalId: string): SpaceMembership {
    const space = this.requireSpace(spaceId)
    this.requireOwner(space, actorPrincipalId)
    if (space.status !== 'active') throw new Error('Archived Space cannot accept members.')
    if (space.visibility === 'private') throw new Error('Private Space cannot add members.')
    const principal = this.requireRootPrincipal(principalId, 'Member')
    const memberships = this.readMemberships()
    if (memberships.some((membership) => membership.spaceId === spaceId && membership.principalId === principal.id)) {
      throw new Error('Principal is already a member of this Space.')
    }
    const membership: SpaceMembership = {
      spaceId,
      principalId: principal.id,
      role: 'member',
      joinedAt: this.now(),
    }
    this.writeMemberships([...memberships, membership])
    return membership
  }

  removeMember(spaceId: string, principalId: string, actorPrincipalId: string): SpaceMembership {
    const space = this.requireSpace(spaceId)
    this.requireOwner(space, actorPrincipalId)
    if (principalId === space.ownerPrincipalId) throw new Error('Space owner membership cannot be removed.')
    const memberships = this.readMemberships()
    const index = memberships.findIndex((membership) => membership.spaceId === spaceId && membership.principalId === principalId)
    if (index < 0) throw new Error('Space membership not found.')
    const [removed] = memberships.splice(index, 1)
    this.writeMemberships(memberships)
    this.writePresences(this.readPresences().filter((presence) => !(presence.spaceId === spaceId && presence.principalId === principalId)))
    return removed
  }

  enterRoot(principalId: string, spaceId: string): SpacePresence {
    const principal = this.requireRootPrincipal(principalId, 'Principal')
    const space = this.requireSpace(spaceId)
    if (space.status !== 'active') throw new Error('Archived Space cannot be entered.')
    const existing = this.getActivePresence(principal.id)
    if (existing) throw new Error('Leave the current Space before entering another Space.')
    if (!this.isMember(space.id, principal.id)) throw new Error('Space membership is required before entry.')
    const presence: SpacePresence = { principalId: principal.id, spaceId: space.id, enteredAt: this.now() }
    this.writePresences([...this.readPresences(), presence])
    return presence
  }

  enterProjection(projection?: Projection): SpacePresence {
    if (!projection || projection.status !== 'active') throw new Error('An active Projection is required for Space entry.')
    assertProjectionSpaceBinding(this, projection.rootPrincipalId, projection.spaceId)
    const principal = this.principals.get(projection.principalId)
    if (!principal || principal.type !== 'projection') throw new Error('Projection Principal not found.')
    const existing = this.getActivePresence(principal.id)
    if (existing) {
      if (existing.spaceId === projection.spaceId) return existing
      throw new Error('Leave the current Space before entering another Space.')
    }
    const presence: SpacePresence = { principalId: principal.id, spaceId: projection.spaceId, enteredAt: this.now() }
    this.writePresences([...this.readPresences(), presence])
    return presence
  }

  leave(principalId: string): SpacePresence {
    const presences = this.readPresences()
    const index = presences.findIndex((presence) => presence.principalId === principalId)
    if (index < 0) throw new Error('Principal is not currently in a Space.')
    const [removed] = presences.splice(index, 1)
    this.writePresences(presences)
    return removed
  }

  leaveIfPresent(principalId: string): SpacePresence | undefined {
    const presence = this.getActivePresence(principalId)
    if (!presence) return undefined
    return this.leave(principalId)
  }

  getActivePresence(principalId: string): SpacePresence | undefined {
    return this.readPresences().find((presence) => presence.principalId === principalId)
  }

  presences(spaceId?: string): SpacePresence[] {
    const values = this.readPresences()
    return spaceId ? values.filter((presence) => presence.spaceId === spaceId) : values
  }

  archive(spaceId: string, actorPrincipalId: string): Space {
    const spaces = this.readSpaces()
    const index = spaces.findIndex((space) => space.id === spaceId)
    if (index < 0) throw new Error('Space not found.')
    const current = spaces[index]
    this.requireOwner(current, actorPrincipalId)
    if (current.status === 'archived') throw new Error('Space is already archived.')
    const timestamp = this.now()
    const archived: Space = { ...current, status: 'archived', updatedAt: timestamp, archivedAt: timestamp }
    spaces[index] = archived
    this.writeSpaces(spaces)
    this.writePresences(this.readPresences().filter((presence) => presence.spaceId !== spaceId))
    return archived
  }

  addResource(spaceId: string, resourceId: string, actorPrincipalId: string): SpaceResourceRef {
    const space = this.requireSpace(spaceId)
    if (space.status !== 'active') throw new Error('Archived Space cannot accept resource references.')
    const resource = resourceId.trim()
    if (!resource) throw new Error('Resource ID is required.')
    if (!this.canActInSpace(spaceId, actorPrincipalId)) throw new Error('Space access is required to add a resource.')
    const refs = this.readResourceRefs()
    if (refs.some((ref) => ref.spaceId === spaceId && ref.resourceId === resource)) {
      throw new Error('Resource is already linked to this Space.')
    }
    const ref: SpaceResourceRef = {
      id: this.createRefId(),
      spaceId,
      resourceId: resource,
      addedByPrincipalId: actorPrincipalId,
      addedAt: this.now(),
    }
    this.writeResourceRefs([...refs, ref])
    return ref
  }

  resourceRefs(spaceId?: string): SpaceResourceRef[] {
    const refs = this.readResourceRefs()
    return spaceId ? refs.filter((ref) => ref.spaceId === spaceId) : refs
  }

  repairDerivedState(resources: ExternalResource[], projections: Projection[]): AiSpaceCleanupResult {
    const resourceIds = new Set(resources.map((item) => item.id))
    const projectionByPrincipal = new Map(projections.map((item) => [item.principalId, item]))
    const spaces = new Map(this.readSpaces().map((item) => [item.id, item]))
    const memberships = new Set(this.readMemberships().map((item) => `${item.spaceId}\u0000${item.principalId}`))
    const seenPrincipals = new Set<string>()

    const beforePresences = this.readPresences()
    const validPresences = beforePresences.filter((presence) => {
      if (seenPrincipals.has(presence.principalId)) return false
      const principal = this.principals.get(presence.principalId)
      const space = spaces.get(presence.spaceId)
      if (!principal || !space || space.status !== 'active') return false
      if (principal.type === 'projection') {
        const projection = projectionByPrincipal.get(principal.id)
        if (!projection || projection.status !== 'active' || projection.spaceId !== presence.spaceId) return false
        if (!memberships.has(`${projection.spaceId}\u0000${projection.rootPrincipalId}`)) return false
      } else if (!memberships.has(`${presence.spaceId}\u0000${principal.id}`)) return false
      seenPrincipals.add(presence.principalId)
      return true
    })

    const beforeRefs = this.readResourceRefs()
    const validRefs = beforeRefs.filter((ref) => spaces.has(ref.spaceId) && resourceIds.has(ref.resourceId))

    if (validPresences.length !== beforePresences.length) this.writePresences(validPresences)
    if (validRefs.length !== beforeRefs.length) this.writeResourceRefs(validRefs)

    return {
      removedPresenceCount: beforePresences.length - validPresences.length,
      removedResourceRefCount: beforeRefs.length - validRefs.length,
    }
  }

  private canActInSpace(spaceId: string, principalId: string): boolean {
    const principal = this.principals.get(principalId)
    if (!principal) return false
    if (principal.type === 'projection') {
      return this.getActivePresence(principal.id)?.spaceId === spaceId
    }
    return this.isMember(spaceId, principal.id)
  }

  private requireSpace(id: string): Space {
    const space = this.get(id)
    if (!space) throw new Error('Space not found.')
    return space
  }

  private requireRootPrincipal(id: string, label: string) {
    const principal = this.principals.get(id)
    if (!principal) throw new Error(`${label} principal not found.`)
    if (principal.type === 'projection') throw new Error(`Projection Principal cannot be a Space ${label.toLowerCase()} membership.`)
    return principal
  }

  private requireOwner(space: Space, actorPrincipalId: string): void {
    if (space.ownerPrincipalId !== actorPrincipalId) throw new Error('Only the Space owner may perform this action.')
  }

  private readSpaces(): Space[] {
    return readArray<Space>(this.storage, SPACES_KEY)
  }

  private writeSpaces(spaces: Space[]): void {
    this.storage.setItem(SPACES_KEY, JSON.stringify(spaces))
  }

  private readMemberships(): SpaceMembership[] {
    return readArray<SpaceMembership>(this.storage, MEMBERSHIPS_KEY)
  }

  private writeMemberships(memberships: SpaceMembership[]): void {
    this.storage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships))
  }

  private readPresences(): SpacePresence[] {
    return readArray<SpacePresence>(this.storage, PRESENCES_KEY)
  }

  private writePresences(presences: SpacePresence[]): void {
    this.storage.setItem(PRESENCES_KEY, JSON.stringify(presences))
  }

  private readResourceRefs(): SpaceResourceRef[] {
    return readArray<SpaceResourceRef>(this.storage, RESOURCE_REFS_KEY)
  }

  private writeResourceRefs(refs: SpaceResourceRef[]): void {
    this.storage.setItem(RESOURCE_REFS_KEY, JSON.stringify(refs))
  }
}
