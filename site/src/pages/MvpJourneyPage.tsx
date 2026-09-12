import { useEffect, useMemo, useState } from 'react'
import type {
  ExternalResource,
  MvpJourney,
  MvpJourneyEvaluation,
  Principal,
  Space,
  SpaceMembership,
} from '../core/types.ts'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function JourneyCard({
  journey,
  evaluation,
  activePrincipal,
  onStartInteraction,
  onCompleteInteraction,
  onPromoteReflection,
  onFinish,
  onAbandon,
}: {
  journey: MvpJourney
  evaluation?: MvpJourneyEvaluation
  activePrincipal: Principal
  onStartInteraction: (journeyId: string) => void
  onCompleteInteraction: (journeyId: string, summary: string) => void
  onPromoteReflection: (journeyId: string, title: string, body: string) => void
  onFinish: (journeyId: string) => void
  onAbandon: (journeyId: string, reason: string) => void
}) {
  const [summary, setSummary] = useState('')
  const [title, setTitle] = useState('MVP Journey reflection')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  function run(action: () => void) {
    try {
      action()
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MVP Journey action failed.')
    }
  }

  const active = journey.status === 'active'
  const projectionIsActive = activePrincipal.id === journey.projectionPrincipalId

  return (
    <article className="surface-panel mvp-journey-card">
      <div className="mvp-journey-header">
        <div>
          <span className="eyebrow">{journey.status} · {journey.id}</span>
          <h3>{journey.label}</h3>
          <p>Root <code>{journey.rootPrincipalId}</code> → Projection <code>{journey.projectionId}</code> → Space <code>{journey.spaceId}</code></p>
        </div>
        <span className={evaluation?.complete ? 'mvp-coherence-badge pass' : evaluation?.coherent ? 'mvp-coherence-badge pending' : 'mvp-coherence-badge fail'}>
          {evaluation?.complete ? 'COHERENT PASS' : evaluation?.coherent ? 'IN PROGRESS' : 'COHERENCE FAIL'}
        </span>
      </div>

      <div className="mvp-reference-grid">
        <div><span>Context</span><code>{journey.contextSessionId}</code></div>
        <div><span>Resource</span><code>{journey.resourceId}</code></div>
        <div><span>Browser</span><code>{journey.browserSessionId ?? '—'}</code></div>
        <div><span>Experience</span><code>{journey.experienceId ?? '—'}</code></div>
        <div><span>Candidate</span><code>{journey.reflectionCandidateId ?? '—'}</code></div>
        <div><span>Board post</span><code>{journey.reflectionPostId ?? '—'}</code></div>
      </div>

      <div className="mvp-stage-list">
        {(evaluation?.stages ?? []).map((stage) => (
          <div className={`mvp-stage-row ${stage.status}`} key={stage.key}>
            <strong>{stage.label}</strong>
            <span>{stage.status}</span>
            <p>{stage.detail}</p>
          </div>
        ))}
      </div>

      {active && !journey.browserSessionId ? (
        <div className="mvp-action-panel">
          <h4>1. Start tracked interaction</h4>
          <p className="muted">The active Principal must be this Journey's Projection. Launching is tracked; browser content is not observed.</p>
          <button className="primary-button" type="button" disabled={!projectionIsActive} onClick={() => run(() => onStartInteraction(journey.id))}>
            Start tracked interaction
          </button>
          {!projectionIsActive ? <span className="muted">Re-enter this Projection from Projections before starting.</span> : null}
        </div>
      ) : null}

      {active && journey.browserSessionId && !journey.experienceId ? (
        <form className="mvp-action-panel" onSubmit={(event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); run(() => onCompleteInteraction(journey.id, summary)); setSummary('') }}>
          <h4>2. Record explicit Experience</h4>
          <label>
            <span>Experience summary</span>
            <textarea rows={4} value={summary} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(event.target.value)} placeholder="What was explicitly experienced or learned?" required />
          </label>
          <button className="primary-button" type="submit">Complete interaction</button>
        </form>
      ) : null}

      {active && journey.experienceId && !journey.reflectionPostId ? (
        <form className="mvp-action-panel" onSubmit={(event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); run(() => onPromoteReflection(journey.id, title, body)); setBody('') }}>
          <h4>3. Promote Experience to Board</h4>
          <label><span>Title</span><input value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} required /></label>
          <label><span>Reflection</span><textarea rows={4} value={body} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)} placeholder="Reflect on the explicit Experience record." required /></label>
          <button className="primary-button" type="submit">Promote reflection</button>
        </form>
      ) : null}

      {active && journey.reflectionPostId ? (
        <div className="mvp-action-panel">
          <h4>4. Return and close</h4>
          <p className="muted">Finish clears Projection Space presence, restores the Root Principal, closes the Context Session, then re-evaluates the full chain.</p>
          <button className="primary-button" type="button" onClick={() => run(() => onFinish(journey.id))}>Finish coherent Journey</button>
        </div>
      ) : null}

      {active ? (
        <div className="mvp-abandon-row">
          <button className="danger-button" type="button" onClick={() => run(() => onAbandon(journey.id, 'abandoned from MVP Journey surface'))}>Abandon Journey</button>
        </div>
      ) : null}

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="mvp-journey-footer">Started {formatTimestamp(journey.startedAt)} · Updated {formatTimestamp(journey.updatedAt)}</div>
    </article>
  )
}

export function MvpJourneyPage({
  journeys,
  evaluations,
  principals,
  spaces,
  memberships,
  resources,
  activePrincipal,
  onStart,
  onStartInteraction,
  onCompleteInteraction,
  onPromoteReflection,
  onFinish,
  onAbandon,
}: {
  journeys: MvpJourney[]
  evaluations: MvpJourneyEvaluation[]
  principals: Principal[]
  spaces: Space[]
  memberships: SpaceMembership[]
  resources: ExternalResource[]
  activePrincipal: Principal
  onStart: (input: { rootPrincipalId: string; spaceId: string; resourceId: string; label?: string }) => void
  onStartInteraction: (journeyId: string) => void
  onCompleteInteraction: (journeyId: string, summary: string) => void
  onPromoteReflection: (journeyId: string, title: string, body: string) => void
  onFinish: (journeyId: string) => void
  onAbandon: (journeyId: string, reason: string) => void
}) {
  const roots = useMemo(() => principals.filter((principal) => principal.type !== 'projection'), [principals])
  const [rootPrincipalId, setRootPrincipalId] = useState(roots[0]?.id ?? '')
  const eligibleSpaces = useMemo(
    () => spaces.filter((space) => space.status === 'active' && memberships.some((membership) => membership.spaceId === space.id && membership.principalId === rootPrincipalId)),
    [spaces, memberships, rootPrincipalId],
  )
  const [spaceId, setSpaceId] = useState(eligibleSpaces[0]?.id ?? '')
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '')
  const [label, setLabel] = useState('First Coherent AI Space MVP')
  const [error, setError] = useState('')
  const evaluationById = useMemo(() => new Map(evaluations.map((evaluation) => [evaluation.journeyId, evaluation])), [evaluations])

  useEffect(() => {
    if (!roots.some((principal) => principal.id === rootPrincipalId)) setRootPrincipalId(roots[0]?.id ?? '')
  }, [roots, rootPrincipalId])

  useEffect(() => {
    if (!eligibleSpaces.some((space) => space.id === spaceId)) setSpaceId(eligibleSpaces[0]?.id ?? '')
  }, [eligibleSpaces, spaceId])

  useEffect(() => {
    if (!resources.some((resource) => resource.id === resourceId)) setResourceId(resources[0]?.id ?? '')
  }, [resources, resourceId])

  function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onStart({ rootPrincipalId, spaceId, resourceId, label })
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start MVP Journey.')
    }
  }

  const completed = journeys.filter((journey) => evaluationById.get(journey.id)?.complete).length

  return (
    <section className="section-block mvp-page">
      <section className="hero-panel mvp-hero">
        <div>
          <span className="eyebrow">v0.1.0 · first coherent MVP</span>
          <h2>Prove the whole AI Space spine in one resumable Journey.</h2>
          <p>Each stage is re-derived from the authoritative stores. The Journey remembers stable references; it never replaces Principal, Space, Experience, Board, or Event truth.</p>
        </div>
        <div className="hero-metrics four-metrics">
          <div><strong>{journeys.length}</strong><span>journeys</span></div>
          <div><strong>{journeys.filter((journey) => journey.status === 'active').length}</strong><span>active</span></div>
          <div><strong>{completed}</strong><span>coherent pass</span></div>
          <div><strong>{resources.length}</strong><span>resources</span></div>
        </div>
      </section>

      <section className="two-column-section mvp-start-grid">
        <form className="surface-panel resource-form" onSubmit={start}>
          <span className="eyebrow">Journey bootstrap</span>
          <h2>Start one coherent run</h2>
          <label><span>Root Principal</span><select value={rootPrincipalId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setRootPrincipalId(event.target.value)} required>{roots.map((principal) => <option key={principal.id} value={principal.id}>{principal.displayName} · {principal.id}</option>)}</select></label>
          <label><span>Space</span><select value={spaceId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSpaceId(event.target.value)} required disabled={eligibleSpaces.length === 0}>{eligibleSpaces.length ? eligibleSpaces.map((space) => <option key={space.id} value={space.id}>{space.name} · {space.id}</option>) : <option value="">No active member Space</option>}</select></label>
          <label><span>Resource</span><select value={resourceId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setResourceId(event.target.value)} required disabled={resources.length === 0}>{resources.length ? resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title} · {resource.type}</option>) : <option value="">Add a Resource in Explore first</option>}</select></label>
          <label><span>Journey label</span><input value={label} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLabel(event.target.value)} required /></label>
          <button className="primary-button" type="submit" disabled={!rootPrincipalId || !spaceId || !resourceId}>Start MVP Journey</button>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
        </form>

        <div className="surface-panel mvp-boundary-panel">
          <span className="eyebrow">Coherence contract</span>
          <h2>References, not copies</h2>
          <ol>
            <li>Root Principal starts one ContextSession.</li>
            <li>A bounded Projection enters a real Space.</li>
            <li>Arcade opens one tracked BrowserSession boundary.</li>
            <li>Explicit completion creates Experience + ReflectionCandidate.</li>
            <li>Promotion creates a BoardPost with source lineage.</li>
            <li>Finish returns Root, closes context, and re-runs all nine gates.</li>
          </ol>
          <p className="muted">Current active Principal: <code>{activePrincipal.id}</code></p>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Persisted integration runs</span><h2>MVP Journeys</h2></div><span className="muted">Reload-safe coherence evaluation.</span></div>
        {journeys.length === 0 ? <div className="empty-state">No MVP Journeys yet. Add an external Resource in Explore if needed, then start one above.</div> : (
          <div className="mvp-journey-list">
            {journeys.map((journey) => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                evaluation={evaluationById.get(journey.id)}
                activePrincipal={activePrincipal}
                onStartInteraction={onStartInteraction}
                onCompleteInteraction={onCompleteInteraction}
                onPromoteReflection={onPromoteReflection}
                onFinish={onFinish}
                onAbandon={onAbandon}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
