import type {
  MvpJourney,
} from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const JOURNEYS_KEY = 'ai-space.mvp-journeys.v1'

export interface CreateMvpJourneyInput {
  label: string
  rootPrincipalId: string
  contextSessionId: string
  projectionId: string
  projectionPrincipalId: string
  spaceId: string
  capabilityId: string
  resourceId: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `journey:${crypto.randomUUID()}`
  return `journey:${Date.now()}-${Math.random().toString(16).slice(2)}`
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

function required(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  return trimmed
}

export class MvpJourneyStore {
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

  create(input: CreateMvpJourneyInput): MvpJourney {
    const timestamp = this.now()
    const journey: MvpJourney = {
      id: this.createId(),
      label: required(input.label, 'Journey label'),
      status: 'active',
      rootPrincipalId: required(input.rootPrincipalId, 'Root Principal ID'),
      contextSessionId: required(input.contextSessionId, 'Context Session ID'),
      projectionId: required(input.projectionId, 'Projection ID'),
      projectionPrincipalId: required(input.projectionPrincipalId, 'Projection Principal ID'),
      spaceId: required(input.spaceId, 'Space ID'),
      capabilityId: required(input.capabilityId, 'Capability ID'),
      resourceId: required(input.resourceId, 'Resource ID'),
      startedAt: timestamp,
      updatedAt: timestamp,
    }
    this.write([...this.read(), journey])
    return journey
  }

  list(): MvpJourney[] {
    return [...this.read()].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id))
  }

  get(id: string): MvpJourney | undefined {
    return this.read().find((journey) => journey.id === id)
  }

  linkInteraction(id: string, browserSessionIdRaw: string): MvpJourney {
    return this.patchActive(id, { browserSessionId: required(browserSessionIdRaw, 'Browser Session ID') })
  }

  linkExperience(id: string, experienceIdRaw: string, reflectionCandidateIdRaw: string): MvpJourney {
    return this.patchActive(id, {
      experienceId: required(experienceIdRaw, 'Experience ID'),
      reflectionCandidateId: required(reflectionCandidateIdRaw, 'Reflection Candidate ID'),
    })
  }

  linkReflection(id: string, reflectionPostIdRaw: string): MvpJourney {
    return this.patchActive(id, { reflectionPostId: required(reflectionPostIdRaw, 'Reflection Post ID') })
  }

  complete(id: string): MvpJourney {
    const journey = this.requireActive(id)
    if (!journey.browserSessionId || !journey.experienceId || !journey.reflectionCandidateId || !journey.reflectionPostId) {
      throw new Error('Journey completion requires interaction, experience, and reflection references.')
    }
    const timestamp = this.now()
    return this.replace(id, { ...journey, status: 'completed', completedAt: timestamp, updatedAt: timestamp })
  }

  abandon(id: string, reasonRaw = 'abandoned'): MvpJourney {
    const journey = this.requireActive(id)
    const timestamp = this.now()
    return this.replace(id, {
      ...journey,
      status: 'abandoned',
      abandonReason: reasonRaw.trim() || 'abandoned',
      abandonedAt: timestamp,
      updatedAt: timestamp,
    })
  }

  private patchActive(id: string, patch: Partial<MvpJourney>): MvpJourney {
    const journey = this.requireActive(id)
    return this.replace(id, { ...journey, ...patch, updatedAt: this.now() })
  }

  private requireActive(id: string): MvpJourney {
    const journey = this.get(id)
    if (!journey) throw new Error('MVP Journey not found.')
    if (journey.status !== 'active') throw new Error('MVP Journey is terminal.')
    return journey
  }

  private replace(id: string, next: MvpJourney): MvpJourney {
    const journeys = this.read()
    const index = journeys.findIndex((journey) => journey.id === id)
    if (index < 0) throw new Error('MVP Journey not found.')
    journeys[index] = next
    this.write(journeys)
    return next
  }

  private read(): MvpJourney[] {
    return readArray<MvpJourney>(this.storage, JOURNEYS_KEY)
  }

  private write(journeys: MvpJourney[]): void {
    this.storage.setItem(JOURNEYS_KEY, JSON.stringify(journeys))
  }
}

import type {
  BoardPost,
  BrowserSession,
  Capability,
  ContextSession,
  ExperienceRecord,
  ExperienceReflectionCandidate,
  ExternalResource,
  MvpJourneyEvaluation,
  MvpJourneyStage,
  MvpJourneyStageKey,
  Principal,
  Projection,
  Space,
  SpaceMembership,
  SpacePresence,
} from './types.ts'

export interface MvpJourneySources {
  principals: Principal[]
  contextSessions: ContextSession[]
  projections: Projection[]
  spaces: Space[]
  memberships: SpaceMembership[]
  presences: SpacePresence[]
  capabilities: Capability[]
  resources: ExternalResource[]
  browserSessions: BrowserSession[]
  experiences: ExperienceRecord[]
  reflectionCandidates: ExperienceReflectionCandidate[]
  posts: BoardPost[]
  activePrincipalId: string
}

const STAGE_LABELS: Record<MvpJourneyStageKey, string> = {
  principal: 'Root Principal',
  context: 'Context Session',
  projection: 'Projection',
  space: 'Space',
  capability: 'Capability / Resource',
  interaction: 'Tracked Interaction',
  experience: 'Experience',
  reflection: 'Reflection',
  return: 'Return / Close',
}

function stage(key: MvpJourneyStageKey, status: MvpJourneyStage['status'], detail: string): MvpJourneyStage {
  return { key, status, label: STAGE_LABELS[key], detail }
}

function missingStage(journey: MvpJourney, key: MvpJourneyStageKey, detail: string): MvpJourneyStage {
  return stage(key, journey.status === 'completed' ? 'fail' : 'pending', detail)
}

export function evaluateMvpJourney(journey: MvpJourney, sources: MvpJourneySources): MvpJourneyEvaluation {
  const stages: MvpJourneyStage[] = []
  const errors: string[] = []
  const fail = (key: MvpJourneyStageKey, detail: string) => {
    stages.push(stage(key, 'fail', detail))
    errors.push(`${STAGE_LABELS[key]}: ${detail}`)
  }
  const pass = (key: MvpJourneyStageKey, detail: string) => stages.push(stage(key, 'pass', detail))
  const pending = (key: MvpJourneyStageKey, detail: string) => stages.push(missingStage(journey, key, detail))

  const root = sources.principals.find((item) => item.id === journey.rootPrincipalId)
  if (!root) fail('principal', 'Root Principal is missing.')
  else if (root.type === 'projection') fail('principal', 'Journey root cannot be a Projection Principal.')
  else pass('principal', `Root ${root.id} exists.`)

  const context = sources.contextSessions.find((item) => item.id === journey.contextSessionId)
  if (!context) fail('context', 'Context Session is missing.')
  else if (context.principalId !== journey.rootPrincipalId) fail('context', 'Context Session does not belong to the Journey root.')
  else if (journey.status === 'completed' && context.status !== 'closed') fail('context', 'Completed Journey Context Session must be closed.')
  else if (journey.status === 'active' && context.status !== 'active') fail('context', 'Active Journey Context Session must remain active.')
  else pass('context', `${context.id} is ${context.status}.`)

  const projection = sources.projections.find((item) => item.id === journey.projectionId)
  const projectionPrincipal = sources.principals.find((item) => item.id === journey.projectionPrincipalId)
  if (!projection) fail('projection', 'Projection is missing.')
  else if (projection.rootPrincipalId !== journey.rootPrincipalId) fail('projection', 'Projection root lineage does not match the Journey root.')
  else if (projection.principalId !== journey.projectionPrincipalId) fail('projection', 'Projection Principal reference does not match the Projection.')
  else if (projection.spaceId !== journey.spaceId) fail('projection', 'Projection Space does not match the Journey Space.')
  else if (!projectionPrincipal || projectionPrincipal.type !== 'projection' || projectionPrincipal.ownerId !== journey.rootPrincipalId) {
    fail('projection', 'Projection Principal lineage is invalid.')
  } else pass('projection', `${projection.id} is bound to ${projection.spaceId}.`)

  const space = sources.spaces.find((item) => item.id === journey.spaceId)
  const membership = sources.memberships.find((item) => item.spaceId === journey.spaceId && item.principalId === journey.rootPrincipalId)
  const projectionPresence = sources.presences.find((item) => item.principalId === journey.projectionPrincipalId)
  if (!space) fail('space', 'Journey Space is missing.')
  else if (!membership) fail('space', 'Journey root is not a member of the Journey Space.')
  else if (journey.status === 'active' && (!projectionPresence || projectionPresence.spaceId !== journey.spaceId)) {
    fail('space', 'Active Journey Projection is not present in its bound Space.')
  } else pass('space', `${space.id} exists and root membership is valid.`)

  const capability = sources.capabilities.find((item) => item.id === journey.capabilityId)
  const resource = sources.resources.find((item) => item.id === journey.resourceId)
  if (!capability) fail('capability', 'Referenced capability is missing.')
  else if (!resource) fail('capability', 'Referenced Resource is missing.')
  else pass('capability', `${capability.id} can address ${resource.id}.`)

  let browserSession: BrowserSession | undefined
  if (!journey.browserSessionId) {
    pending('interaction', 'Tracked Browser Session has not started yet.')
  } else {
    browserSession = sources.browserSessions.find((item) => item.id === journey.browserSessionId)
    if (!browserSession) fail('interaction', 'Referenced Browser Session is missing.')
    else if (
      browserSession.projectionId !== journey.projectionId
      || browserSession.principalId !== journey.projectionPrincipalId
      || browserSession.rootPrincipalId !== journey.rootPrincipalId
      || browserSession.spaceId !== journey.spaceId
      || browserSession.contextSessionId !== journey.contextSessionId
      || browserSession.resourceId !== journey.resourceId
    ) fail('interaction', 'Browser Session lineage does not match the Journey.')
    else if (journey.status === 'completed' && browserSession.status !== 'completed') fail('interaction', 'Completed Journey Browser Session must be completed.')
    else if (browserSession.status === 'abandoned') fail('interaction', 'Journey Browser Session was abandoned.')
    else pass('interaction', `${browserSession.id} is ${browserSession.status}.`)
  }

  let experience: ExperienceRecord | undefined
  if (!journey.experienceId) {
    pending('experience', 'Experience has not been recorded yet.')
  } else {
    experience = sources.experiences.find((item) => item.id === journey.experienceId)
    if (!experience) fail('experience', 'Referenced Experience is missing.')
    else if (
      experience.browserSessionId !== journey.browserSessionId
      || experience.projectionId !== journey.projectionId
      || experience.principalId !== journey.projectionPrincipalId
      || experience.rootPrincipalId !== journey.rootPrincipalId
      || experience.spaceId !== journey.spaceId
      || experience.contextSessionId !== journey.contextSessionId
      || experience.resourceId !== journey.resourceId
    ) fail('experience', 'Experience lineage does not match the Journey Browser Session and context.')
    else pass('experience', `${experience.id} preserves Browser Session lineage.`)
  }

  if (!journey.reflectionCandidateId || !journey.reflectionPostId) {
    pending('reflection', 'Experience reflection has not been promoted to Board yet.')
  } else {
    const candidate = sources.reflectionCandidates.find((item) => item.id === journey.reflectionCandidateId)
    const post = sources.posts.find((item) => item.id === journey.reflectionPostId)
    if (!candidate) fail('reflection', 'Referenced Reflection Candidate is missing.')
    else if (!post) fail('reflection', 'Referenced Board Post is missing.')
    else if (candidate.experienceId !== journey.experienceId || candidate.status !== 'promoted' || candidate.postId !== post.id) {
      fail('reflection', 'Reflection Candidate promotion lineage is invalid.')
    } else if (
      post.principalId !== journey.projectionPrincipalId
      || post.contextSessionId !== journey.contextSessionId
      || post.sourceSessionId !== journey.browserSessionId
      || post.sourceResourceId !== journey.resourceId
      || (experience && experience.reflectionPostId !== post.id)
    ) fail('reflection', 'Board Post lineage does not match the Journey Experience.')
    else pass('reflection', `${post.id} is the promoted Experience reflection.`)
  }

  if (journey.status !== 'completed') {
    stages.push(stage('return', 'pending', 'Return to Root and close the Context Session to complete the Journey.'))
  } else if (sources.activePrincipalId !== journey.rootPrincipalId) {
    fail('return', 'Completed Journey did not return the active Principal to Root.')
  } else if (projectionPresence) {
    fail('return', 'Completed Journey Projection still has active Space presence.')
  } else if (!context || context.status !== 'closed') {
    fail('return', 'Completed Journey Context Session is not closed.')
  } else pass('return', 'Root is active, Projection presence is cleared, and Context Session is closed.')

  const coherent = errors.length === 0
  const complete = coherent && journey.status === 'completed' && stages.every((item) => item.status === 'pass')
  return { journeyId: journey.id, coherent, complete, stages, errors }
}

import type { PrincipalStore } from './principals.ts'
import type { ContextSessionStore } from './contextSessions.ts'
import type { ProjectionStore } from './projections.ts'
import type { SpaceStore } from './spaces.ts'
import type { ResourceStore } from './resources.ts'
import type { BrowserSessionStore } from './browserSessions.ts'
import type { PostStore } from './posts.ts'
import { assertProjectionSpaceBinding } from './spaces.ts'
import { createBrowserLaunchPlan } from './browserSessions.ts'
import { assertProjectionRuntimeAccess } from './projections.ts'

export interface MvpJourneyRuntimeDependencies {
  journeys: MvpJourneyStore
  principals: PrincipalStore
  contexts: ContextSessionStore
  projections: ProjectionStore
  spaces: SpaceStore
  resources: ResourceStore
  browsers: BrowserSessionStore
  posts: PostStore
  capabilities: Capability[]
}

export interface BeginMvpJourneyInput {
  rootPrincipalId: string
  spaceId: string
  resourceId: string
  label?: string
}

export class MvpJourneyRuntime {
  private readonly journeys: MvpJourneyStore
  private readonly principals: PrincipalStore
  private readonly contexts: ContextSessionStore
  private readonly projections: ProjectionStore
  private readonly spaces: SpaceStore
  private readonly resources: ResourceStore
  private readonly browsers: BrowserSessionStore
  private readonly posts: PostStore
  private readonly capabilities: Capability[]

  constructor(deps: MvpJourneyRuntimeDependencies) {
    this.journeys = deps.journeys
    this.principals = deps.principals
    this.contexts = deps.contexts
    this.projections = deps.projections
    this.spaces = deps.spaces
    this.resources = deps.resources
    this.browsers = deps.browsers
    this.posts = deps.posts
    this.capabilities = deps.capabilities
  }

  list(): MvpJourney[] {
    return this.journeys.list()
  }

  get(id: string): MvpJourney | undefined {
    return this.journeys.get(id)
  }

  begin(input: BeginMvpJourneyInput) {
    const root = this.principals.get(input.rootPrincipalId)
    if (!root) throw new Error('Root Principal not found.')
    if (root.type === 'projection') throw new Error('MVP Journey root must be a Root Principal.')
    if (this.contexts.getActive(root.id)) throw new Error('Root Principal already has an active Context Session.')

    const space = assertProjectionSpaceBinding(this.spaces, root.id, input.spaceId)
    const resource = this.requireResource(input.resourceId)
    const capability = this.capabilities.find((item) => item.id === 'arcade')
    if (!capability) throw new Error('Arcade capability is not registered.')

    const label = input.label?.trim() || `MVP Journey · ${resource.title}`
    const context = this.contexts.start({ principalId: root.id, label })
    const projection = this.projections.create({
      rootPrincipalId: root.id,
      spaceId: space.id,
      displayName: `${root.displayName} · MVP · ${space.name}`,
      role: 'mvp-journey',
      permissionScope: ['arcade:START_BROWSER_SESSION'],
      memoryScope: [],
      mergePolicy: 'reviewed',
    })
    this.spaces.enterProjection(projection)
    this.principals.setActive(projection.principalId)

    const journey = this.journeys.create({
      label,
      rootPrincipalId: root.id,
      contextSessionId: context.id,
      projectionId: projection.id,
      projectionPrincipalId: projection.principalId,
      spaceId: space.id,
      capabilityId: capability.id,
      resourceId: resource.id,
    })
    return { journey, context, projection, space, resource }
  }

  startInteraction(journeyId: string) {
    const journey = this.requireActiveJourney(journeyId)
    if (journey.browserSessionId) throw new Error('MVP Journey interaction has already started.')
    if (this.principals.getActive().id !== journey.projectionPrincipalId) {
      throw new Error('Enter the Journey Projection before starting the interaction.')
    }
    const projection = this.requireProjection(journey)
    assertProjectionRuntimeAccess(this.spaces, projection, 'arcade', 'START_BROWSER_SESSION')
    const resource = this.requireResource(journey.resourceId)
    const plan = createBrowserLaunchPlan(projection, resource)
    const session = this.browsers.start({ projection, resource, contextSessionId: journey.contextSessionId })
    const updated = this.journeys.linkInteraction(journey.id, session.id)
    return { journey: updated, session, plan }
  }

  completeInteraction(journeyId: string, summary: string) {
    const journey = this.requireActiveJourney(journeyId)
    if (!journey.browserSessionId) throw new Error('Start the Journey interaction before completing it.')
    if (journey.experienceId) throw new Error('MVP Journey Experience is already recorded.')
    const result = this.browsers.complete(journey.browserSessionId, summary)
    const updated = this.journeys.linkExperience(journey.id, result.experience.id, result.candidate.id)
    return { journey: updated, ...result }
  }

  promoteReflection(journeyId: string, title: string, body: string) {
    const journey = this.requireActiveJourney(journeyId)
    if (!journey.experienceId || !journey.reflectionCandidateId || !journey.browserSessionId) {
      throw new Error('Record the Journey Experience before promoting a reflection.')
    }
    if (journey.reflectionPostId) throw new Error('MVP Journey reflection is already promoted.')

    const experience = this.browsers.experiences().find((item) => item.id === journey.experienceId)
    if (!experience) throw new Error('Journey Experience not found.')
    const candidate = this.browsers.reflectionCandidates().find((item) => item.id === journey.reflectionCandidateId)
    if (!candidate) throw new Error('Journey Reflection Candidate not found.')

    const post = this.posts.create({
      principalId: experience.principalId,
      contextSessionId: experience.contextSessionId,
      title,
      body,
      sourceSessionId: experience.browserSessionId,
      sourceResourceId: experience.resourceId,
    })
    const promotedCandidate = this.browsers.promoteReflection(candidate.id, post.id)
    const updated = this.journeys.linkReflection(journey.id, post.id)
    return { journey: updated, experience: this.browsers.experiences().find((item) => item.id === experience.id)!, candidate: promotedCandidate, post }
  }

  finish(journeyId: string) {
    const journey = this.requireActiveJourney(journeyId)
    const before = this.evaluate(journey.id)
    const blocking = before.stages.filter((item) => item.key !== 'return' && item.status !== 'pass')
    if (!before.coherent || blocking.length > 0) {
      throw new Error(`MVP Journey cannot finish before all pre-return stages pass: ${blocking.map((item) => item.label).join(', ')}`)
    }

    this.spaces.leaveIfPresent(journey.projectionPrincipalId)
    this.principals.setActive(journey.rootPrincipalId)
    const context = this.contexts.get(journey.contextSessionId)
    if (!context) throw new Error('Journey Context Session not found.')
    if (context.status !== 'active') throw new Error('Journey Context Session must be active before finish.')
    this.contexts.close(context.id)

    const completed = this.journeys.complete(journey.id)
    const evaluation = this.evaluate(completed.id)
    if (!evaluation.complete) throw new Error(`Completed MVP Journey failed coherence: ${evaluation.errors.join('; ')}`)
    return { journey: completed, evaluation }
  }

  abandon(journeyId: string, reason = 'abandoned'): MvpJourney {
    const journey = this.requireActiveJourney(journeyId)
    if (journey.browserSessionId) {
      const browser = this.browsers.get(journey.browserSessionId)
      if (browser?.status === 'active') this.browsers.abandon(browser.id, reason)
    }
    this.spaces.leaveIfPresent(journey.projectionPrincipalId)
    if (this.principals.get(journey.rootPrincipalId)) this.principals.setActive(journey.rootPrincipalId)
    const context = this.contexts.get(journey.contextSessionId)
    if (context?.status === 'active') this.contexts.close(context.id)
    return this.journeys.abandon(journey.id, reason)
  }

  evaluate(journeyId: string): MvpJourneyEvaluation {
    const journey = this.journeys.get(journeyId)
    if (!journey) throw new Error('MVP Journey not found.')
    return evaluateMvpJourney(journey, {
      principals: this.principals.list(),
      contextSessions: this.contexts.list(),
      projections: this.projections.list(),
      spaces: this.spaces.list(),
      memberships: this.spaces.allMemberships(),
      presences: this.spaces.presences(),
      capabilities: this.capabilities,
      resources: this.resources.list(),
      browserSessions: this.browsers.sessions(),
      experiences: this.browsers.experiences(),
      reflectionCandidates: this.browsers.reflectionCandidates(),
      posts: this.posts.list(),
      activePrincipalId: this.principals.getActive().id,
    })
  }

  private requireActiveJourney(id: string): MvpJourney {
    const journey = this.journeys.get(id)
    if (!journey) throw new Error('MVP Journey not found.')
    if (journey.status !== 'active') throw new Error('MVP Journey is terminal.')
    return journey
  }

  private requireProjection(journey: MvpJourney): Projection {
    const projection = this.projections.get(journey.projectionId)
    if (!projection || projection.principalId !== journey.projectionPrincipalId) throw new Error('Journey Projection not found.')
    return projection
  }

  private requireResource(id: string): ExternalResource {
    const resource = this.resources.list().find((item) => item.id === id)
    if (!resource) throw new Error('Journey Resource not found.')
    return resource
  }
}

export class MvpJourneyRecovery {
  private readonly journeys: MvpJourneyStore
  private readonly principals: PrincipalStore
  private readonly contexts: ContextSessionStore
  private readonly projections: ProjectionStore
  private readonly spaces: SpaceStore
  private readonly browsers: BrowserSessionStore
  private readonly posts: PostStore

  constructor(deps: MvpJourneyRuntimeDependencies) {
    this.journeys = deps.journeys
    this.principals = deps.principals
    this.contexts = deps.contexts
    this.projections = deps.projections
    this.spaces = deps.spaces
    this.browsers = deps.browsers
    this.posts = deps.posts
  }

  reconcileReferences(id: string): MvpJourney {
    let journey = this.requireActive(id)
    if (!journey.browserSessionId) return journey

    if (!journey.experienceId || !journey.reflectionCandidateId) {
      const experienceMatches = journey.experienceId
        ? this.browsers.experiences().filter((item) => item.id === journey.experienceId)
        : this.browsers.experiences().filter((item) => item.browserSessionId === journey.browserSessionId)
      if (experienceMatches.length === 1) {
        const experience = experienceMatches[0]
        const candidateMatches = journey.reflectionCandidateId
          ? this.browsers.reflectionCandidates().filter((item) => item.id === journey.reflectionCandidateId && item.experienceId === experience.id)
          : this.browsers.reflectionCandidates().filter((item) => item.experienceId === experience.id)
        if (candidateMatches.length === 1) {
          journey = this.journeys.linkExperience(journey.id, experience.id, candidateMatches[0].id)
        }
      }
    }

    if (journey.experienceId && journey.reflectionCandidateId && !journey.reflectionPostId) {
      const experience = this.browsers.experiences().find((item) => item.id === journey.experienceId)
      const candidate = this.browsers.reflectionCandidates().find((item) => item.id === journey.reflectionCandidateId)
      if (
        experience
        && candidate
        && candidate.experienceId === experience.id
        && candidate.status === 'promoted'
        && candidate.postId
        && experience.reflectionPostId === candidate.postId
      ) {
        const post = this.posts.list().find((item) => item.id === candidate.postId)
        if (
          post
          && post.principalId === journey.projectionPrincipalId
          && post.contextSessionId === journey.contextSessionId
          && post.sourceSessionId === journey.browserSessionId
          && post.sourceResourceId === journey.resourceId
        ) {
          journey = this.journeys.linkReflection(journey.id, post.id)
        }
      }
    }

    return journey
  }

  resume(id: string): MvpJourney {
    const journey = this.requireActive(id)
    const root = this.principals.get(journey.rootPrincipalId)
    if (!root || root.type === 'projection') throw new Error('Journey Root Principal is not resumable.')
    const context = this.contexts.get(journey.contextSessionId)
    if (!context || context.principalId !== root.id || context.status !== 'active') {
      throw new Error('Journey Context Session is not active and resumable.')
    }
    const projection = this.projections.get(journey.projectionId)
    if (
      !projection
      || projection.status !== 'active'
      || projection.principalId !== journey.projectionPrincipalId
      || projection.rootPrincipalId !== root.id
      || projection.spaceId !== journey.spaceId
    ) throw new Error('Journey Projection is not active and resumable.')

    assertProjectionSpaceBinding(this.spaces, root.id, journey.spaceId)
    const presence = this.spaces.getActivePresence(projection.principalId)
    if (presence && presence.spaceId !== projection.spaceId) this.spaces.leave(projection.principalId)
    this.spaces.enterProjection(projection)
    this.principals.setActive(projection.principalId)
    return journey
  }

  abandonBroken(id: string, reason = 'hardening recovery'): MvpJourney {
    const journey = this.requireActive(id)
    if (journey.browserSessionId) {
      const browser = this.browsers.get(journey.browserSessionId)
      if (browser?.status === 'active') this.browsers.abandon(browser.id, reason)
    }
    this.spaces.leaveIfPresent(journey.projectionPrincipalId)
    const root = this.principals.get(journey.rootPrincipalId)
    if (root && root.type !== 'projection') this.principals.setActive(root.id)
    const context = this.contexts.get(journey.contextSessionId)
    if (context?.status === 'active') this.contexts.close(context.id)
    return this.journeys.abandon(journey.id, reason)
  }

  private requireActive(id: string): MvpJourney {
    const journey = this.journeys.get(id)
    if (!journey) throw new Error('MVP Journey not found.')
    if (journey.status !== 'active') throw new Error('MVP Journey is terminal.')
    return journey
  }
}
