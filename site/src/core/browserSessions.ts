import type {
  BrowserLaunchPlan,
  BrowserSession,
  ExperienceRecord,
  ExperienceReflectionCandidate,
  ExternalResource,
  Projection,
} from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'
import { projectionAllows } from './projections.ts'
import { validateExternalUrl } from './resources.ts'

const BROWSER_SESSIONS_KEY = 'ai-space.browser-sessions.v1'
const EXPERIENCES_KEY = 'ai-space.experience-records.v1'
const REFLECTION_CANDIDATES_KEY = 'ai-space.experience-reflection-candidates.v1'

export interface StartBrowserSessionInput {
  projection: Projection
  resource: ExternalResource
  contextSessionId?: string
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}:${crypto.randomUUID()}`
  return `${prefix}:${Date.now()}-${Math.random().toString(16).slice(2)}`
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

export function createBrowserLaunchPlan(projection: Projection | undefined, resource: ExternalResource): BrowserLaunchPlan {
  if (!projection || projection.status !== 'active') throw new Error('An active Projection is required for a tracked browser session.')
  if (!projectionAllows(projection, 'arcade', 'START_BROWSER_SESSION')) {
    throw new Error('Projection permission denied: arcade:START_BROWSER_SESSION')
  }
  const url = validateExternalUrl(resource.url)
  return {
    url,
    target: '_blank',
    features: 'noopener,noreferrer',
    trust: 'untrusted-external',
    isolation: 'noopener-noreferrer-only',
    projectionId: projection.id,
    principalId: projection.principalId,
    rootPrincipalId: projection.rootPrincipalId,
    spaceId: projection.spaceId,
  }
}

export class BrowserSessionStore {
  private readonly storage: StorageAdapter
  private readonly now: () => string
  private readonly createSessionId: () => string
  private readonly createExperienceId: () => string
  private readonly createCandidateId: () => string

  constructor(
    storage: StorageAdapter,
    now: () => string = () => new Date().toISOString(),
    createSessionId: () => string = () => makeId('browser'),
    createExperienceId: () => string = () => makeId('experience'),
    createCandidateId: () => string = () => makeId('candidate'),
  ) {
    this.storage = storage
    this.now = now
    this.createSessionId = createSessionId
    this.createExperienceId = createExperienceId
    this.createCandidateId = createCandidateId
  }

  start(input: StartBrowserSessionInput): BrowserSession {
    const plan = createBrowserLaunchPlan(input.projection, input.resource)
    const duplicate = this.sessions().find(
      (item) => item.status === 'active'
        && item.projectionId === input.projection.id
        && item.resourceId === input.resource.id,
    )
    if (duplicate) throw new Error('A tracked browser session is already active for this Projection and resource.')

    const session: BrowserSession = {
      id: this.createSessionId(),
      principalId: plan.principalId,
      projectionId: plan.projectionId,
      rootPrincipalId: plan.rootPrincipalId,
      spaceId: plan.spaceId,
      ...(input.contextSessionId ? { contextSessionId: input.contextSessionId } : {}),
      resourceId: input.resource.id,
      url: plan.url,
      status: 'active',
      trust: plan.trust,
      isolation: plan.isolation,
      startedAt: this.now(),
    }
    this.writeSessions([...this.sessions(), session])
    return session
  }

  sessions(): BrowserSession[] {
    return readArray<BrowserSession>(this.storage, BROWSER_SESSIONS_KEY)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  get(id: string): BrowserSession | undefined {
    return this.sessions().find((item) => item.id === id)
  }

  complete(id: string, summaryRaw: string): { session: BrowserSession; experience: ExperienceRecord; candidate: ExperienceReflectionCandidate } {
    const summary = summaryRaw.trim()
    if (!summary) throw new Error('Experience summary is required.')

    const sessions = this.sessions()
    const index = sessions.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('Browser Session not found.')
    const current = sessions[index]
    if (current.status !== 'active') throw new Error('Only active Browser Sessions can complete.')

    const timestamp = this.now()
    const completed: BrowserSession = { ...current, status: 'completed', endedAt: timestamp }
    sessions[index] = completed
    this.writeSessions(sessions)

    const experience: ExperienceRecord = {
      id: this.createExperienceId(),
      browserSessionId: completed.id,
      principalId: completed.principalId,
      projectionId: completed.projectionId,
      rootPrincipalId: completed.rootPrincipalId,
      spaceId: completed.spaceId,
      ...(completed.contextSessionId ? { contextSessionId: completed.contextSessionId } : {}),
      resourceId: completed.resourceId,
      summary,
      createdAt: timestamp,
    }
    this.storage.setItem(EXPERIENCES_KEY, JSON.stringify([...this.experiences(), experience]))

    const candidate: ExperienceReflectionCandidate = {
      id: this.createCandidateId(),
      experienceId: experience.id,
      status: 'pending',
      createdAt: timestamp,
    }
    this.storage.setItem(REFLECTION_CANDIDATES_KEY, JSON.stringify([...this.reflectionCandidates(), candidate]))

    return { session: completed, experience, candidate }
  }

  abandon(id: string, reasonRaw = 'abandoned'): BrowserSession {
    const reason = reasonRaw.trim() || 'abandoned'
    const sessions = this.sessions()
    const index = sessions.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('Browser Session not found.')
    const current = sessions[index]
    if (current.status !== 'active') throw new Error('Only active Browser Sessions can be abandoned.')
    const abandoned: BrowserSession = {
      ...current,
      status: 'abandoned',
      abandonReason: reason,
      endedAt: this.now(),
    }
    sessions[index] = abandoned
    this.writeSessions(sessions)
    return abandoned
  }

  promoteReflection(candidateId: string, postIdRaw: string): ExperienceReflectionCandidate {
    const postId = postIdRaw.trim()
    if (!postId) throw new Error('Board post ID is required.')

    const candidates = this.reflectionCandidates()
    const candidateIndex = candidates.findIndex((item) => item.id === candidateId)
    if (candidateIndex < 0) throw new Error('Reflection Candidate not found.')
    const current = candidates[candidateIndex]
    if (current.status === 'promoted') throw new Error('Reflection Candidate is already promoted.')

    const experiences = this.experiences()
    const experienceIndex = experiences.findIndex((item) => item.id === current.experienceId)
    if (experienceIndex < 0) throw new Error('Experience Record not found.')

    const timestamp = this.now()
    const promoted: ExperienceReflectionCandidate = {
      ...current,
      status: 'promoted',
      promotedAt: timestamp,
      postId,
    }
    candidates[candidateIndex] = promoted
    experiences[experienceIndex] = { ...experiences[experienceIndex], reflectionPostId: postId }
    this.storage.setItem(REFLECTION_CANDIDATES_KEY, JSON.stringify(candidates))
    this.storage.setItem(EXPERIENCES_KEY, JSON.stringify(experiences))
    return promoted
  }

  experiences(): ExperienceRecord[] {
    return readArray<ExperienceRecord>(this.storage, EXPERIENCES_KEY)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  reflectionCandidates(): ExperienceReflectionCandidate[] {
    return readArray<ExperienceReflectionCandidate>(this.storage, REFLECTION_CANDIDATES_KEY)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  private writeSessions(items: BrowserSession[]): void {
    this.storage.setItem(BROWSER_SESSIONS_KEY, JSON.stringify(items))
  }
}
