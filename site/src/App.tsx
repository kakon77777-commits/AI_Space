import { useEffect, useMemo, useState } from 'react'
import { capabilities } from './data/capabilities.ts'
import { getNavigationCapabilities, resolveCapability } from './core/registry.ts'
import { loadCapabilityManifest, manifestToProvider } from './core/capabilityAdapter.ts'
import { CapabilityRuntimeManager } from './core/capabilityRuntime.ts'
import { getPageModel } from './core/shell.ts'
import { EventStore, type NewActivityEvent } from './core/events.ts'
import { ResourceStore, selectGameResources } from './core/resources.ts'
import { PostStore } from './core/posts.ts'
import { SessionStore } from './core/sessions.ts'
import { PrincipalStore, type CreatePrincipalInput } from './core/principals.ts'
import { ContextSessionStore } from './core/contextSessions.ts'
import { ProjectionStore, assertProjectionRuntimeAccess, invokeWithProjectionRuntimeAccess, projectionEventLineage, type CreateProjectionInput } from './core/projections.ts'
import { BrowserSessionStore, createBrowserLaunchPlan } from './core/browserSessions.ts'
import { SpaceStore, assertProjectionSpaceBinding } from './core/spaces.ts'
import { MvpJourneyRuntime, MvpJourneyStore } from './core/mvpJourneys.ts'
import { exportAuthoritativeAiSpaceStateBundle, parseAiSpaceStateBundle, previewAiSpaceStateRestore, validateAiSpaceStateRestore } from './core/statePortability.ts'
import { StateAuthorityStore } from './core/stateAuthority.ts'
import { applyPlannedAiSpaceStateMigration, planAiSpaceStateMigration, replaceAiSpaceStateBundleWithAuthority } from './core/stateMigration.ts'
import type { ActivityEvent, BoardPost, BrowserSession, Capability, CapabilityDispatchPlan, CapabilityProvider, CapabilityRuntimeSnapshot, ContextSession, ExperienceRecord, ExperienceReflectionCandidate, ExternalResource, GameSession, MvpJourney, MvpJourneyEvaluation, Principal, Projection, ProjectionCheckpoint, ProjectionMergeCandidate, ResourceType, Space, SpaceMembership, SpacePresence, SpaceResourceRef, SpaceVisibility } from './core/types.ts'
import { createAiBoardMessage, listAiBoardMessages, type AiBoardCreateMessageInput, type AiBoardMessage } from './core/aiBoard.ts'
import { BrowserStorageAdapter } from './storage/storage.ts'
import { ShellLayout } from './components/ShellLayout.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { WorldsPage } from './pages/WorldsPage.tsx'
import { BoardPage } from './pages/BoardPage.tsx'
import { ArcadePage } from './pages/ArcadePage.tsx'
import { ExplorePage } from './pages/ExplorePage.tsx'
import { HistoryPage } from './pages/HistoryPage.tsx'
import { CapabilitiesPage } from './pages/CapabilitiesPage.tsx'
import { AgentsPage } from './pages/AgentsPage.tsx'
import { ProjectionsPage } from './pages/ProjectionsPage.tsx'
import { SpacesPage } from './pages/SpacesPage.tsx'
import { MvpJourneyPage } from './pages/MvpJourneyPage.tsx'
import { BackupPage, type BackupPreviewResult } from './pages/BackupPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

type ContextualActivityInput = Omit<NewActivityEvent, 'principalId' | 'contextSessionId' | 'projectionId' | 'rootPrincipalId' | 'spaceId'> & {
  principalId?: string
  contextSessionId?: string | null
  projectionId?: string | null
  rootPrincipalId?: string | null
  spaceId?: string | null
}

function currentRoute(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/'
}

function externalOpen(resource: ExternalResource): void {
  const opened = window.open(resource.url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

export function App() {
  const storage = useMemo(() => new BrowserStorageAdapter(window.localStorage), [])
  const eventStore = useMemo(() => new EventStore(storage), [storage])
  const resourceStore = useMemo(() => new ResourceStore(storage), [storage])
  const postStore = useMemo(() => new PostStore(storage), [storage])
  const sessionStore = useMemo(() => new SessionStore(storage), [storage])
  const browserSessionStore = useMemo(() => new BrowserSessionStore(storage), [storage])
  const principalStore = useMemo(() => {
    const store = new PrincipalStore(storage)
    store.ensureDefault()
    return store
  }, [storage])
  const contextSessionStore = useMemo(() => new ContextSessionStore(storage), [storage])
  const spaceStore = useMemo(() => {
    const store = new SpaceStore(storage, principalStore)
    store.ensureBuiltIns(principalStore.ensureDefault().id)
    return store
  }, [storage, principalStore])
  const projectionStore = useMemo(() => new ProjectionStore(storage, principalStore), [storage, principalStore])
  const journeyStore = useMemo(() => new MvpJourneyStore(storage), [storage])
  const journeyRuntime = useMemo(() => new MvpJourneyRuntime({
    journeys: journeyStore,
    principals: principalStore,
    contexts: contextSessionStore,
    projections: projectionStore,
    spaces: spaceStore,
    resources: resourceStore,
    browsers: browserSessionStore,
    posts: postStore,
    capabilities,
  }), [journeyStore, principalStore, contextSessionStore, projectionStore, spaceStore, resourceStore, browserSessionStore, postStore])
  const runtimeManager = useMemo(() => new CapabilityRuntimeManager(storage), [storage])
  const navigation = useMemo(() => getNavigationCapabilities(capabilities), [])

  const [route, setRoute] = useState(currentRoute)
  const [events, setEvents] = useState<ActivityEvent[]>(() => eventStore.list())
  const [resources, setResources] = useState<ExternalResource[]>(() => resourceStore.list())
  const [posts, setPosts] = useState<BoardPost[]>(() => postStore.list())
  const [sessions, setSessions] = useState<GameSession[]>(() => sessionStore.list())
  const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>(() => browserSessionStore.sessions())
  const [experiences, setExperiences] = useState<ExperienceRecord[]>(() => browserSessionStore.experiences())
  const [experienceReflectionCandidates, setExperienceReflectionCandidates] = useState<ExperienceReflectionCandidate[]>(() => browserSessionStore.reflectionCandidates())
  const [principals, setPrincipals] = useState<Principal[]>(() => principalStore.list())
  const [activePrincipal, setActivePrincipal] = useState<Principal>(() => principalStore.getActive())
  const [contextSessions, setContextSessions] = useState<ContextSession[]>(() => contextSessionStore.list())
  const [projections, setProjections] = useState<Projection[]>(() => projectionStore.list())
  const [projectionCheckpoints, setProjectionCheckpoints] = useState<ProjectionCheckpoint[]>(() => projectionStore.checkpoints())
  const [projectionMergeCandidates, setProjectionMergeCandidates] = useState<ProjectionMergeCandidate[]>(() => projectionStore.mergeCandidates())
  const [spaces, setSpaces] = useState<Space[]>(() => spaceStore.list())
  const [spaceMemberships, setSpaceMemberships] = useState<SpaceMembership[]>(() => spaceStore.allMemberships())
  const [spacePresences, setSpacePresences] = useState<SpacePresence[]>(() => spaceStore.presences())
  const [spaceResourceRefs, setSpaceResourceRefs] = useState<SpaceResourceRef[]>(() => spaceStore.resourceRefs())
  const [mvpJourneys, setMvpJourneys] = useState<MvpJourney[]>(() => journeyStore.list())
  const [runtimeSnapshots, setRuntimeSnapshots] = useState<CapabilityRuntimeSnapshot[]>([])
  const providers: CapabilityProvider[] = runtimeSnapshots.map((snapshot) => snapshot.provider)
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null)
  const [remoteBoardMessages, setRemoteBoardMessages] = useState<AiBoardMessage[]>([])
  const [remoteBoardBusy, setRemoteBoardBusy] = useState(false)
  const [remoteBoardError, setRemoteBoardError] = useState<string | null>(null)

  const activeContextSession = contextSessions.find((session) => session.principalId === activePrincipal.id && session.status === 'active')
  const activeProjection = projections.find((projection) => projection.principalId === activePrincipal.id)
  const activeSpacePresence = spacePresences.find((presence) => presence.principalId === activePrincipal.id)
  const activeSpace = activeSpacePresence ? spaces.find((space) => space.id === activeSpacePresence.spaceId) : undefined
  const rootPrincipals = principals.filter((principal) => principal.type !== 'projection')
  const activePrincipalGameSessions = sessions.filter((session) => session.principalId === activePrincipal.id)
  const mvpEvaluations = useMemo<MvpJourneyEvaluation[]>(() => mvpJourneys.map((journey) => journeyRuntime.evaluate(journey.id)), [mvpJourneys, principals, contextSessions, projections, spaces, spaceMemberships, spacePresences, resources, browserSessions, experiences, experienceReflectionCandidates, posts, activePrincipal.id, journeyRuntime])

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [route])

  useEffect(() => {
    let cancelled = false
    loadCapabilityManifest('/manifests/ai-board.capability.json')
      .then(async (manifest) => {
        const snapshot = runtimeManager.register(manifestToProvider(manifest))
        if (!cancelled) {
          setRuntimeSnapshots(runtimeManager.list())
          setProviderLoadError(null)
        }
        if (snapshot.state.enabled) {
          await runtimeManager.probe(manifest.id)
          if (!cancelled) setRuntimeSnapshots(runtimeManager.list())
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRuntimeSnapshots([])
          setProviderLoadError(error instanceof Error ? error.message : 'Unknown manifest error')
        }
      })
    return () => { cancelled = true }
  }, [runtimeManager])

  const page = getPageModel(capabilities, route)
  const activeCapability = page.kind === 'capability' ? capabilities.find((capability) => capability.id === page.capabilityId) : undefined

  function refreshEvents() { setEvents(eventStore.list()) }
  function refreshResources() { setResources(resourceStore.list()) }
  function refreshPosts() { setPosts(postStore.list()) }
  function refreshSessions() { setSessions(sessionStore.list()) }
  function refreshBrowserExperience() {
    setBrowserSessions(browserSessionStore.sessions())
    setExperiences(browserSessionStore.experiences())
    setExperienceReflectionCandidates(browserSessionStore.reflectionCandidates())
  }
  function refreshPrincipals() { setPrincipals(principalStore.list()) }
  function refreshContextSessions() { setContextSessions(contextSessionStore.list()) }
  function refreshProjections() {
    setProjections(projectionStore.list())
    setProjectionCheckpoints(projectionStore.checkpoints())
    setProjectionMergeCandidates(projectionStore.mergeCandidates())
  }
  function refreshSpaces() {
    setSpaces(spaceStore.list())
    setSpaceMemberships(spaceStore.allMemberships())
    setSpacePresences(spaceStore.presences())
    setSpaceResourceRefs(spaceStore.resourceRefs())
  }
  function refreshRuntime() { setRuntimeSnapshots(runtimeManager.list()) }
  function refreshMvpJourneys() { setMvpJourneys(journeyStore.list()) }
  function refreshMvpAffectedState() {
    refreshMvpJourneys()
    refreshPrincipals()
    setActivePrincipal(principalStore.getActive())
    refreshContextSessions()
    refreshProjections()
    refreshSpaces()
    refreshBrowserExperience()
    refreshPosts()
  }

  function appendActivity(input: ContextualActivityInput): ActivityEvent {
    const principalId = input.principalId ?? activePrincipal.id
    const contextSessionId = input.contextSessionId === null
      ? undefined
      : input.contextSessionId ?? contextSessionStore.getActive(principalId)?.id
    const projection = projectionStore.getByPrincipalId(principalId)
    const lineage = projectionEventLineage(projection)
    const explicitProjectionId = input.projectionId === null ? undefined : input.projectionId
    const explicitRootPrincipalId = input.rootPrincipalId === null ? undefined : input.rootPrincipalId
    const explicitSpaceId = input.spaceId === null ? undefined : input.spaceId
    const projectionId = explicitProjectionId ?? lineage.projectionId
    const rootPrincipalId = explicitRootPrincipalId ?? lineage.rootPrincipalId
    const spaceId = explicitSpaceId ?? spaceStore.getActivePresence(principalId)?.spaceId ?? lineage.spaceId
    const { principalId: _principal, contextSessionId: _context, projectionId: _projection, rootPrincipalId: _root, spaceId: _space, ...rest } = input
    const event = eventStore.append({
      ...rest,
      principalId,
      ...(contextSessionId ? { contextSessionId } : {}),
      ...(projectionId ? { projectionId } : {}),
      ...(rootPrincipalId ? { rootPrincipalId } : {}),
      ...(spaceId ? { spaceId } : {}),
    })
    refreshEvents()
    return event
  }

  function createPrincipal(input: CreatePrincipalInput): void {
    const creator = activePrincipal
    const created = principalStore.create(input)
    appendActivity({ principalId: creator.id, action: 'PRINCIPAL_CREATED', capabilityId: 'agents', summary: `Created principal ${created.displayName} (${created.id})` })
    principalStore.setActive(created.id)
    setActivePrincipal(created)
    refreshPrincipals()
    appendActivity({ principalId: created.id, contextSessionId: contextSessionStore.getActive(created.id)?.id ?? null, action: 'PRINCIPAL_ACTIVATED', capabilityId: 'agents', summary: `Activated principal ${created.displayName}` })
  }

  function selectPrincipal(id: string): void {
    const selected = principalStore.setActive(id)
    setActivePrincipal(selected)
    appendActivity({ principalId: selected.id, contextSessionId: contextSessionStore.getActive(selected.id)?.id ?? null, action: 'PRINCIPAL_ACTIVATED', capabilityId: 'agents', summary: `Activated principal ${selected.displayName}` })
  }

  function startContextSession(label: string): void {
    const session = contextSessionStore.start({ principalId: activePrincipal.id, label })
    refreshContextSessions()
    appendActivity({ principalId: activePrincipal.id, contextSessionId: session.id, action: 'CONTEXT_SESSION_STARTED', capabilityId: 'agents', summary: `Started context: ${session.label}` })
  }

  function closeContextSession(id: string): void {
    const session = contextSessionStore.close(id)
    refreshContextSessions()
    appendActivity({ principalId: session.principalId, contextSessionId: session.id, action: 'CONTEXT_SESSION_CLOSED', capabilityId: 'agents', summary: `Closed context: ${session.label}` })
  }

  function createSpace(input: { name: string; description?: string; visibility: SpaceVisibility }): void {
    if (activePrincipal.type === 'projection') throw new Error('Return to a Root Principal before creating a Space.')
    const space = spaceStore.create({ ...input, ownerPrincipalId: activePrincipal.id })
    refreshSpaces()
    appendActivity({ spaceId: space.id, action: 'SPACE_CREATED', capabilityId: 'spaces', summary: `Created ${space.visibility} Space ${space.name} (${space.id})` })
  }

  function enterSpace(spaceId: string): void {
    if (activePrincipal.type === 'projection') throw new Error('Projection Space presence is controlled through Projection Enter/Return.')
    const presence = spaceStore.enterRoot(activePrincipal.id, spaceId)
    refreshSpaces()
    appendActivity({ principalId: presence.principalId, spaceId: presence.spaceId, action: 'SPACE_ENTERED', capabilityId: 'spaces', summary: `Entered Space ${presence.spaceId}` })
  }

  function leaveSpace(): void {
    if (activePrincipal.type === 'projection') throw new Error('Projection Space presence is controlled through Projection Enter/Return.')
    const presence = spaceStore.leave(activePrincipal.id)
    refreshSpaces()
    appendActivity({ principalId: presence.principalId, spaceId: presence.spaceId, action: 'SPACE_LEFT', capabilityId: 'spaces', summary: `Left Space ${presence.spaceId}` })
  }

  function addSpaceMember(spaceId: string, principalId: string): void {
    const membership = spaceStore.addMember(spaceId, principalId, activePrincipal.id)
    refreshSpaces()
    appendActivity({ spaceId, action: 'SPACE_MEMBER_ADDED', capabilityId: 'spaces', summary: `Added ${membership.principalId} to Space ${spaceId}` })
  }

  function removeSpaceMember(spaceId: string, principalId: string): void {
    const membership = spaceStore.removeMember(spaceId, principalId, activePrincipal.id)
    refreshSpaces()
    appendActivity({ spaceId, action: 'SPACE_MEMBER_REMOVED', capabilityId: 'spaces', summary: `Removed ${membership.principalId} from Space ${spaceId}` })
  }

  function archiveSpace(spaceId: string): void {
    const space = spaceStore.archive(spaceId, activePrincipal.id)
    refreshSpaces()
    appendActivity({ spaceId: space.id, action: 'SPACE_ARCHIVED', capabilityId: 'spaces', summary: `Archived Space ${space.name} (${space.id})` })
  }

  function addResourceToSpace(spaceId: string, resourceId: string): void {
    const ref = spaceStore.addResource(spaceId, resourceId, activePrincipal.id)
    const resource = resources.find((item) => item.id === resourceId)
    refreshSpaces()
    appendActivity({ spaceId, resourceId, action: 'SPACE_RESOURCE_LINKED', capabilityId: 'spaces', summary: `Linked resource ${resource?.title ?? resourceId} to Space ${spaceId} via ${ref.id}` })
  }

  function createProjection(input: CreateProjectionInput): void {
    assertProjectionSpaceBinding(spaceStore, input.rootPrincipalId, input.spaceId)
    const projection = projectionStore.create(input)
    refreshPrincipals()
    refreshProjections()
    appendActivity({ principalId: projection.rootPrincipalId, spaceId: projection.spaceId, action: 'PROJECTION_CREATED', capabilityId: 'projections', summary: `Created Projection ${projection.id} for ${projection.spaceId}` })
  }

  function enterProjection(id: string): void {
    const projection = projectionStore.get(id)
    if (!projection) throw new Error('Projection not found.')
    if (projection.status !== 'active') throw new Error('Only active Projections can be entered.')
    assertProjectionSpaceBinding(spaceStore, projection.rootPrincipalId, projection.spaceId)
    spaceStore.enterProjection(projection)
    const principal = principalStore.setActive(projection.principalId)
    setActivePrincipal(principal)
    refreshPrincipals()
    refreshSpaces()
    appendActivity({ principalId: principal.id, contextSessionId: contextSessionStore.getActive(principal.id)?.id ?? null, spaceId: projection.spaceId, action: 'PROJECTION_ENTERED', capabilityId: 'projections', summary: `Entered Projection ${projection.id} in ${projection.spaceId}` })
  }

  function returnProjectionToRoot(id: string): void {
    const projection = projectionStore.get(id)
    if (!projection) throw new Error('Projection not found.')
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, spaceId: projection.spaceId, action: 'PROJECTION_RETURNED_TO_ROOT', capabilityId: 'projections', summary: `Returned from Projection ${projection.id} to root ${projection.rootPrincipalId}` })
    spaceStore.leaveIfPresent(projection.principalId)
    const root = principalStore.setActive(projection.rootPrincipalId)
    setActivePrincipal(root)
    refreshPrincipals()
    refreshSpaces()
  }

  function suspendProjection(id: string): void {
    const projection = projectionStore.suspend(id)
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, spaceId: projection.spaceId, action: 'PROJECTION_SUSPENDED', capabilityId: 'projections', summary: `Suspended Projection ${projection.id}` })
    spaceStore.leaveIfPresent(projection.principalId)
    refreshSpaces()
    if (activePrincipal.id === projection.principalId) {
      const root = principalStore.setActive(projection.rootPrincipalId)
      setActivePrincipal(root)
      refreshPrincipals()
    }
    refreshProjections()
  }

  function resumeProjection(id: string): void {
    const projection = projectionStore.resume(id)
    refreshProjections()
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, spaceId: projection.spaceId, action: 'PROJECTION_RESUMED', capabilityId: 'projections', summary: `Resumed Projection ${projection.id}` })
  }

  function archiveProjection(id: string): void {
    const projection = projectionStore.archive(id)
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, spaceId: projection.spaceId, action: 'PROJECTION_ARCHIVED', capabilityId: 'projections', summary: `Archived Projection ${projection.id}` })
    spaceStore.leaveIfPresent(projection.principalId)
    refreshSpaces()
    if (activePrincipal.id === projection.principalId) {
      const root = principalStore.setActive(projection.rootPrincipalId)
      setActivePrincipal(root)
      refreshPrincipals()
    }
    refreshProjections()
  }

  function checkpointProjection(id: string, summary: string): void {
    const checkpoint = projectionStore.checkpoint(id, summary)
    const projection = projectionStore.get(id)!
    refreshProjections()
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, action: 'PROJECTION_CHECKPOINT_CREATED', capabilityId: 'projections', summary: `Created Projection checkpoint ${checkpoint.id}` })
  }

  function createProjectionMergeCandidate(id: string, checkpointId?: string): void {
    const candidate = projectionStore.createMergeCandidate(id, checkpointId)
    const projection = projectionStore.get(id)!
    refreshProjections()
    appendActivity({ principalId: projection.principalId, contextSessionId: contextSessionStore.getActive(projection.principalId)?.id ?? null, action: 'PROJECTION_MERGE_CANDIDATE_CREATED', capabilityId: 'projections', summary: `Created pending merge candidate ${candidate.id}` })
  }

  function navigate(capability: Capability) {
    appendActivity({ action: 'CAPABILITY_OPENED', capabilityId: capability.id, summary: `Opened ${capability.label}` })
    window.location.hash = capability.route === '/' ? '#/' : `#${capability.route}`
  }

  function addResource(input: { title: string; type: ResourceType; url: string }) {
    const resource = resourceStore.add(input)
    appendActivity({ action: 'RESOURCE_ADDED', capabilityId: 'explore', resourceId: resource.id, summary: `Added ${resource.type}: ${resource.title}` })
    refreshResources()
  }

  function openResource(resource: ExternalResource) {
    appendActivity({ action: resource.type === 'game' ? 'GAME_LINK_OPENED' : 'EXTERNAL_OPENED', capabilityId: resource.type === 'game' ? 'arcade' : 'explore', resourceId: resource.id, summary: `Opened external ${resource.type}: ${resource.title}` })
    externalOpen(resource)
  }

  function startTrackedBrowserSession(resource: ExternalResource): void {
    if (!activeProjection) throw new Error('Enter an active Projection before starting a tracked browser session.')
    assertProjectionRuntimeAccess(spaceStore, activeProjection, 'arcade', 'START_BROWSER_SESSION')
    const plan = createBrowserLaunchPlan(activeProjection, resource)
    const session = browserSessionStore.start({
      projection: activeProjection,
      resource,
      contextSessionId: activeContextSession?.id,
    })
    const opened = window.open(plan.url, plan.target, plan.features)
    if (!opened) {
      const abandoned = browserSessionStore.abandon(session.id, 'popup-blocked')
      refreshBrowserExperience()
      appendActivity({
        principalId: abandoned.principalId,
        contextSessionId: abandoned.contextSessionId ?? null,
        action: 'BROWSER_SESSION_LAUNCH_BLOCKED',
        capabilityId: 'arcade',
        resourceId: abandoned.resourceId,
        sessionId: abandoned.id,
        summary: `Tracked browser launch was blocked for ${resource.title}`,
      })
      return
    }
    opened.opener = null
    refreshBrowserExperience()
    appendActivity({
      principalId: session.principalId,
      contextSessionId: session.contextSessionId ?? null,
      action: 'BROWSER_SESSION_STARTED',
      capabilityId: 'arcade',
      resourceId: resource.id,
      sessionId: session.id,
      summary: `Started tracked external browser session: ${resource.title}`,
    })
  }

  function completeTrackedBrowserSession(session: BrowserSession, summary: string): void {
    const result = browserSessionStore.complete(session.id, summary)
    const resource = resources.find((item) => item.id === session.resourceId)
    refreshBrowserExperience()
    appendActivity({
      principalId: result.session.principalId,
      contextSessionId: result.session.contextSessionId ?? null,
      action: 'BROWSER_SESSION_COMPLETED',
      capabilityId: 'arcade',
      resourceId: result.session.resourceId,
      sessionId: result.session.id,
      summary: `Completed tracked browser session: ${resource?.title ?? result.session.resourceId}`,
    })
    appendActivity({
      principalId: result.experience.principalId,
      contextSessionId: result.experience.contextSessionId ?? null,
      action: 'EXPERIENCE_RECORDED',
      capabilityId: 'arcade',
      resourceId: result.experience.resourceId,
      sessionId: result.experience.browserSessionId,
      summary: `Recorded explicit browser experience: ${result.experience.summary}`,
    })
  }

  function abandonTrackedBrowserSession(session: BrowserSession): void {
    const abandoned = browserSessionStore.abandon(session.id, 'user-abandoned')
    const resource = resources.find((item) => item.id === abandoned.resourceId)
    refreshBrowserExperience()
    appendActivity({
      principalId: abandoned.principalId,
      contextSessionId: abandoned.contextSessionId ?? null,
      action: 'BROWSER_SESSION_ABANDONED',
      capabilityId: 'arcade',
      resourceId: abandoned.resourceId,
      sessionId: abandoned.id,
      summary: `Abandoned tracked browser session: ${resource?.title ?? abandoned.resourceId}`,
    })
  }

  function promoteExperienceReflection(experience: ExperienceRecord, candidate: ExperienceReflectionCandidate): void {
    const resource = resources.find((item) => item.id === experience.resourceId)
    const post = postStore.create({
      principalId: experience.principalId,
      contextSessionId: experience.contextSessionId,
      title: `Experience: ${resource?.title ?? experience.resourceId}`,
      body: experience.summary,
      sourceSessionId: experience.browserSessionId,
      sourceResourceId: experience.resourceId,
    })
    browserSessionStore.promoteReflection(candidate.id, post.id)
    refreshPosts()
    refreshBrowserExperience()
    appendActivity({
      principalId: experience.principalId,
      contextSessionId: experience.contextSessionId ?? null,
      action: 'EXPERIENCE_REFLECTION_PROMOTED',
      capabilityId: 'arcade',
      resourceId: experience.resourceId,
      sessionId: experience.browserSessionId,
      summary: `Promoted browser experience to Board: ${post.title}`,
    })
  }

  function createBoardPost(input: { title: string; body: string }) {
    const post = postStore.create({ principalId: activePrincipal.id, contextSessionId: activeContextSession?.id, ...input })
    appendActivity({ action: 'BOARD_POST_CREATED', capabilityId: 'board', summary: `Created Board post: ${post.title}` })
    refreshPosts()
  }

  function startGameSession(resource: ExternalResource) {
    const session = sessionStore.start({ principalId: activePrincipal.id, resourceId: resource.id, contextSessionId: activeContextSession?.id })
    appendActivity({ principalId: session.principalId, contextSessionId: session.contextSessionId ?? null, action: 'GAME_SESSION_STARTED', capabilityId: 'arcade', resourceId: resource.id, sessionId: session.id, summary: `Started game session: ${resource.title}` })
    refreshSessions()
  }

  function endGameSession(session: GameSession) {
    const completed = sessionStore.complete(session.id)
    const resource = resources.find((item) => item.id === completed.resourceId)
    appendActivity({ principalId: completed.principalId, contextSessionId: completed.contextSessionId ?? null, action: 'GAME_SESSION_ENDED', capabilityId: 'arcade', resourceId: completed.resourceId, sessionId: completed.id, summary: `Ended game session: ${resource?.title ?? completed.resourceId}` })
    refreshSessions()
  }

  function createGameReflection(session: GameSession, input: { title: string; body: string }) {
    const post = postStore.create({ principalId: session.principalId, contextSessionId: session.contextSessionId, ...input, sourceSessionId: session.id, sourceResourceId: session.resourceId })
    sessionStore.linkReflection(session.id, post.id)
    const resource = resources.find((item) => item.id === session.resourceId)
    appendActivity({ principalId: session.principalId, contextSessionId: session.contextSessionId ?? null, action: 'GAME_REFLECTION_CREATED', capabilityId: 'arcade', resourceId: session.resourceId, sessionId: session.id, summary: `Saved game reflection: ${resource?.title ?? session.resourceId}` })
    refreshPosts()
    refreshSessions()
  }

  function startMvpJourney(input: { rootPrincipalId: string; spaceId: string; resourceId: string; label?: string }): void {
    const result = journeyRuntime.begin(input)
    refreshMvpAffectedState()
    appendActivity({
      principalId: result.journey.rootPrincipalId,
      contextSessionId: result.journey.contextSessionId,
      projectionId: result.journey.projectionId,
      rootPrincipalId: result.journey.rootPrincipalId,
      spaceId: result.journey.spaceId,
      action: 'MVP_JOURNEY_STARTED',
      capabilityId: 'mvp',
      resourceId: result.journey.resourceId,
      summary: `Started coherent MVP Journey ${result.journey.id}`,
    })
  }

  function startMvpInteraction(journeyId: string): void {
    const result = journeyRuntime.startInteraction(journeyId)
    const opened = window.open(result.plan.url, result.plan.target, result.plan.features)
    if (!opened) {
      const before = result.journey
      journeyRuntime.abandon(journeyId, 'popup-blocked')
      refreshMvpAffectedState()
      appendActivity({
        principalId: before.rootPrincipalId,
        contextSessionId: before.contextSessionId,
        projectionId: before.projectionId,
        rootPrincipalId: before.rootPrincipalId,
        spaceId: before.spaceId,
        action: 'MVP_JOURNEY_ABANDONED',
        capabilityId: 'mvp',
        resourceId: before.resourceId,
        sessionId: result.session.id,
        summary: `Abandoned MVP Journey ${before.id}: popup blocked`,
      })
      throw new Error('Browser popup was blocked; the MVP Journey was safely abandoned.')
    }
    opened.opener = null
    refreshMvpAffectedState()
    appendActivity({
      principalId: result.journey.projectionPrincipalId,
      contextSessionId: result.journey.contextSessionId,
      projectionId: result.journey.projectionId,
      rootPrincipalId: result.journey.rootPrincipalId,
      spaceId: result.journey.spaceId,
      action: 'MVP_INTERACTION_STARTED',
      capabilityId: 'mvp',
      resourceId: result.journey.resourceId,
      sessionId: result.session.id,
      summary: `Started tracked MVP interaction ${result.session.id}`,
    })
  }

  function completeMvpInteraction(journeyId: string, summary: string): void {
    const result = journeyRuntime.completeInteraction(journeyId, summary)
    refreshMvpAffectedState()
    appendActivity({
      principalId: result.journey.projectionPrincipalId,
      contextSessionId: result.journey.contextSessionId,
      projectionId: result.journey.projectionId,
      rootPrincipalId: result.journey.rootPrincipalId,
      spaceId: result.journey.spaceId,
      action: 'MVP_EXPERIENCE_RECORDED',
      capabilityId: 'mvp',
      resourceId: result.journey.resourceId,
      sessionId: result.session.id,
      summary: `Recorded MVP Experience ${result.experience.id}: ${result.experience.summary}`,
    })
  }

  function promoteMvpReflection(journeyId: string, title: string, body: string): void {
    const result = journeyRuntime.promoteReflection(journeyId, title, body)
    refreshMvpAffectedState()
    appendActivity({
      principalId: result.journey.projectionPrincipalId,
      contextSessionId: result.journey.contextSessionId,
      projectionId: result.journey.projectionId,
      rootPrincipalId: result.journey.rootPrincipalId,
      spaceId: result.journey.spaceId,
      action: 'MVP_REFLECTION_PROMOTED',
      capabilityId: 'mvp',
      resourceId: result.journey.resourceId,
      sessionId: result.experience.browserSessionId,
      summary: `Promoted MVP Experience to Board post ${result.post.id}`,
    })
  }

  function finishMvpJourney(journeyId: string): void {
    const before = journeyRuntime.get(journeyId)
    if (!before) throw new Error('MVP Journey not found.')
    const result = journeyRuntime.finish(journeyId)
    refreshMvpAffectedState()
    appendActivity({
      principalId: result.journey.rootPrincipalId,
      contextSessionId: result.journey.contextSessionId,
      projectionId: result.journey.projectionId,
      rootPrincipalId: result.journey.rootPrincipalId,
      spaceId: result.journey.spaceId,
      action: 'MVP_JOURNEY_COMPLETED',
      capabilityId: 'mvp',
      resourceId: result.journey.resourceId,
      sessionId: result.journey.browserSessionId,
      summary: `Completed coherent MVP Journey ${result.journey.id}: ${result.evaluation.stages.length}/9 stages pass`,
    })
  }

  function abandonMvpJourney(journeyId: string, reason: string): void {
    const before = journeyRuntime.get(journeyId)
    if (!before) throw new Error('MVP Journey not found.')
    const abandoned = journeyRuntime.abandon(journeyId, reason)
    refreshMvpAffectedState()
    appendActivity({
      principalId: abandoned.rootPrincipalId,
      contextSessionId: abandoned.contextSessionId,
      projectionId: abandoned.projectionId,
      rootPrincipalId: abandoned.rootPrincipalId,
      spaceId: abandoned.spaceId,
      action: 'MVP_JOURNEY_ABANDONED',
      capabilityId: 'mvp',
      resourceId: abandoned.resourceId,
      sessionId: abandoned.browserSessionId,
      summary: `Abandoned MVP Journey ${abandoned.id}: ${abandoned.abandonReason ?? reason}`,
    })
  }

  async function managedInvoke(capabilityId: string, action: string, input?: unknown): Promise<{ status: number; data: unknown }> {
    const actingProjection = projectionStore.getByPrincipalId(activePrincipal.id)
    return invokeWithProjectionRuntimeAccess(
      spaceStore,
      actingProjection,
      capabilityId,
      action,
      () => runtimeManager.invoke(capabilityId, action, input),
    )
  }

  function aiBoardProvider(): CapabilityProvider {
    try { return runtimeManager.get('child:ai-board').provider }
    catch { throw new Error('AI Board child provider is not loaded yet.') }
  }

  async function aiBoardInvoke(action: string, input?: unknown): Promise<{ status: number; data: unknown }> {
    const result = await managedInvoke('child:ai-board', action, input)
    refreshRuntime()
    return result
  }

  async function refreshRemoteBoard(): Promise<void> {
    setRemoteBoardBusy(true)
    setRemoteBoardError(null)
    try {
      const provider = aiBoardProvider()
      const messages = await listAiBoardMessages(provider.manifest, { limit: 20 }, undefined, aiBoardInvoke)
      setRemoteBoardMessages(messages)
      appendActivity({ action: 'REMOTE_BOARD_POSTS_READ', capabilityId: provider.manifest.id, summary: `Read ${messages.length} remote AI Board message${messages.length === 1 ? '' : 's'}` })
      refreshRuntime()
    } catch (caught) {
      setRemoteBoardError(caught instanceof Error ? caught.message : 'Remote AI Board read failed.')
    } finally {
      setRemoteBoardBusy(false)
    }
  }

  async function createRemoteBoardPost(input: AiBoardCreateMessageInput): Promise<string> {
    setRemoteBoardBusy(true)
    setRemoteBoardError(null)
    try {
      const provider = aiBoardProvider()
      const result = await createAiBoardMessage(provider.manifest, input, undefined, aiBoardInvoke)
      appendActivity({ action: input.parentId?.trim() ? 'REMOTE_BOARD_COMMENT_CREATED' : 'REMOTE_BOARD_POST_CREATED', capabilityId: provider.manifest.id, summary: `Created remote AI Board message: ${result.id}` })
      try {
        const messages = await listAiBoardMessages(provider.manifest, { limit: 20 }, undefined, aiBoardInvoke)
        setRemoteBoardMessages(messages)
        refreshRuntime()
      } catch (refreshError) {
        const detail = refreshError instanceof Error ? refreshError.message : 'remote refresh failed'
        setRemoteBoardError(`Post succeeded as ${result.id}, but refresh failed: ${detail}`)
      }
      return result.id
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Remote AI Board post failed.'
      setRemoteBoardError(message)
      throw caught
    } finally {
      setRemoteBoardBusy(false)
    }
  }


  async function probeProvider(capabilityId: string): Promise<void> {
    const snapshot = await runtimeManager.probe(capabilityId)
    appendActivity({ action: 'PROVIDER_PROBED', capabilityId, summary: `Probed ${snapshot.provider.manifest.name}: ${snapshot.state.health}` })
    refreshRuntime()
  }

  function toggleProvider(capabilityId: string): void {
    const current = runtimeManager.get(capabilityId)
    const next = runtimeManager.setEnabled(capabilityId, !current.state.enabled)
    appendActivity({ action: next.state.enabled ? 'PROVIDER_ENABLED' : 'PROVIDER_DISABLED', capabilityId, summary: `${next.state.enabled ? 'Enabled' : 'Disabled'} ${next.provider.manifest.name}` })
    refreshRuntime()
  }

  function previewProvider(capabilityId: string, action: string, input?: unknown): CapabilityDispatchPlan {
    return runtimeManager.preview(capabilityId, action, input)
  }

  async function invokeProvider(capabilityId: string, action: string, input?: unknown): Promise<{ status: number; data: unknown }> {
    try {
      const result = await managedInvoke(capabilityId, action, input)
      appendActivity({ action: 'PROVIDER_INVOKED', capabilityId, summary: `Invoked ${action} on ${capabilityId} (HTTP ${result.status})` })
      refreshRuntime()
      return result
    } catch (error) {
      appendActivity({ action: 'PROVIDER_INVOKE_FAILED', capabilityId, summary: `Invoke ${action} failed on ${capabilityId}: ${error instanceof Error ? error.message : String(error)}` })
      refreshRuntime()
      throw error
    }
  }

  function getStateAuthority() {
    return new StateAuthorityStore(storage).get()
  }

  function exportStateBundleJson(): string {
    const bundle = exportAuthoritativeAiSpaceStateBundle(storage, { appVersion: '0.1.3' })
    return JSON.stringify(bundle, null, 2)
  }

  function previewStateBundleRestore(text: string): BackupPreviewResult {
    const bundle = parseAiSpaceStateBundle(text)
    const validation = validateAiSpaceStateRestore(bundle, { capabilities })
    return {
      preview: previewAiSpaceStateRestore(bundle, storage),
      warningCount: validation.audit.warningCount,
      sourceVersion: bundle.appVersion,
      createdAt: bundle.createdAt,
      migrationPlan: planAiSpaceStateMigration(bundle, storage),
    }
  }

  function safeMigrateStateBundle(text: string): void {
    const bundle = parseAiSpaceStateBundle(text)
    applyPlannedAiSpaceStateMigration(bundle, storage, { capabilities })
    window.location.reload()
  }

  function restoreStateBundle(text: string): void {
    const bundle = parseAiSpaceStateBundle(text)
    replaceAiSpaceStateBundleWithAuthority(bundle, storage, { capabilities })
    window.location.reload()
  }

  function clearEvents() {
    eventStore.clear()
    refreshEvents()
  }

  let content: React.ReactNode
  if (page.kind === 'not-found') {
    content = <NotFoundPage onHome={() => navigate(capabilities[0])} />
  } else {
    switch (page.capabilityId) {
      case 'home':
        content = <HomePage capabilities={capabilities} events={events} resources={resources} posts={posts} sessions={activePrincipalGameSessions} providers={providers} providerLoadError={providerLoadError} onOpenCapability={navigate} />
        break
      case 'worlds':
        content = <WorldsPage />
        break
      case 'board':
        content = <BoardPage posts={posts} onCreate={createBoardPost} remoteProvider={providers.find((item) => item.manifest.id === 'child:ai-board')} remoteMessages={remoteBoardMessages} remoteBusy={remoteBoardBusy} remoteError={remoteBoardError} onRemoteRefresh={refreshRemoteBoard} onRemoteCreate={createRemoteBoardPost} />
        break
      case 'arcade':
        content = <ArcadePage games={selectGameResources(resources)} sessions={activePrincipalGameSessions} browserSessions={browserSessions} experiences={experiences} reflectionCandidates={experienceReflectionCandidates} activeProjection={activeProjection} onOpen={openResource} onStart={startGameSession} onEnd={endGameSession} onReflect={createGameReflection} onStartBrowser={startTrackedBrowserSession} onCompleteBrowser={completeTrackedBrowserSession} onAbandonBrowser={abandonTrackedBrowserSession} onPromoteExperience={promoteExperienceReflection} onGoExplore={() => navigate(resolveCapability(capabilities, '/explore')!)} />
        break
      case 'explore':
        content = <ExplorePage resources={resources} onAdd={addResource} onOpen={openResource} />
        break
      case 'history':
        content = <HistoryPage events={events} onClear={clearEvents} />
        break
      case 'agents':
        content = <AgentsPage principals={rootPrincipals} activePrincipal={activePrincipal} sessions={contextSessions} activeContextSession={activeContextSession} onCreatePrincipal={createPrincipal} onSelectPrincipal={selectPrincipal} onStartContext={startContextSession} onCloseContext={closeContextSession} />
        break
      case 'spaces':
        content = <SpacesPage spaces={spaces} memberships={spaceMemberships} presences={spacePresences} resourceRefs={spaceResourceRefs} resources={resources} events={events} principals={principals} activePrincipal={activePrincipal} activeProjection={activeProjection} activeSpace={activeSpace} onCreate={createSpace} onEnter={enterSpace} onLeave={leaveSpace} onAddMember={addSpaceMember} onRemoveMember={removeSpaceMember} onArchive={archiveSpace} onAddResource={addResourceToSpace} />
        break
      case 'projections':
        content = <ProjectionsPage principals={principals} activePrincipal={activePrincipal} projections={projections} checkpoints={projectionCheckpoints} mergeCandidates={projectionMergeCandidates} spaces={spaces} memberships={spaceMemberships} onCreate={createProjection} onEnter={enterProjection} onReturn={returnProjectionToRoot} onSuspend={suspendProjection} onResume={resumeProjection} onArchive={archiveProjection} onCheckpoint={checkpointProjection} onMergeCandidate={createProjectionMergeCandidate} />
        break
      case 'backup':
        content = <BackupPage onGetAuthority={getStateAuthority} onExport={exportStateBundleJson} onPreview={previewStateBundleRestore} onSafeMigrate={safeMigrateStateBundle} onRestore={restoreStateBundle} />
        break
      case 'mvp':
        content = <MvpJourneyPage journeys={mvpJourneys} evaluations={mvpEvaluations} principals={principals} spaces={spaces} memberships={spaceMemberships} resources={resources} activePrincipal={activePrincipal} onStart={startMvpJourney} onStartInteraction={startMvpInteraction} onCompleteInteraction={completeMvpInteraction} onPromoteReflection={promoteMvpReflection} onFinish={finishMvpJourney} onAbandon={abandonMvpJourney} />
        break
      case 'capabilities':
        content = <CapabilitiesPage snapshots={runtimeSnapshots} onProbe={probeProvider} onToggle={toggleProvider} onPreview={previewProvider} onInvoke={invokeProvider} />
        break
      default:
        content = <NotFoundPage onHome={() => navigate(capabilities[0])} />
    }
  }

  return (
    <ShellLayout capabilities={navigation} activeCapability={activeCapability} activePrincipal={activePrincipal} activeContextSession={activeContextSession} activeProjection={activeProjection} activeSpace={activeSpace} onNavigate={navigate}>
      {content}
    </ShellLayout>
  )
}
