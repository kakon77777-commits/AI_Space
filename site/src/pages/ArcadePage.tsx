import { useState } from 'react'
import type {
  BrowserSession,
  ExperienceRecord,
  ExperienceReflectionCandidate,
  ExternalResource,
  GameSession,
  Projection,
} from '../core/types.ts'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function ReflectionForm({ session, onReflect }: { session: GameSession; onReflect: (session: GameSession, input: { title: string; body: string }) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onReflect(session, { title, body })
      setTitle('')
      setBody('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save reflection.')
    }
  }

  return (
    <form className="reflection-form" onSubmit={submit}>
      <input value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder="Reflection title" required />
      <textarea value={body} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)} placeholder="What did this session teach us?" rows={4} required />
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="secondary-button" type="submit">Save to Board</button>
    </form>
  )
}

function BrowserCompletionForm({ session, onComplete }: { session: BrowserSession; onComplete: (session: BrowserSession, summary: string) => void }) {
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onComplete(session, summary)
      setSummary('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete browser session.')
    }
  }

  return (
    <form className="reflection-form" onSubmit={submit}>
      <textarea
        value={summary}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(event.target.value)}
        placeholder="Explicit experience summary — AI Space does not infer browser state automatically."
        rows={3}
        required
      />
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="primary-button" type="submit">Complete + record experience</button>
    </form>
  )
}

export function ArcadePage({
  games,
  sessions,
  browserSessions,
  experiences,
  reflectionCandidates,
  activeProjection,
  onOpen,
  onStart,
  onEnd,
  onReflect,
  onStartBrowser,
  onCompleteBrowser,
  onAbandonBrowser,
  onPromoteExperience,
  onGoExplore,
}: {
  games: ExternalResource[]
  sessions: GameSession[]
  browserSessions: BrowserSession[]
  experiences: ExperienceRecord[]
  reflectionCandidates: ExperienceReflectionCandidate[]
  activeProjection?: Projection
  onOpen: (resource: ExternalResource) => void
  onStart: (resource: ExternalResource) => void
  onEnd: (session: GameSession) => void
  onReflect: (session: GameSession, input: { title: string; body: string }) => void
  onStartBrowser: (resource: ExternalResource) => void
  onCompleteBrowser: (session: BrowserSession, summary: string) => void
  onAbandonBrowser: (session: BrowserSession) => void
  onPromoteExperience: (experience: ExperienceRecord, candidate: ExperienceReflectionCandidate) => void
  onGoExplore: () => void
}) {
  const resourceById = new Map(games.map((game) => [game.id, game]))
  const activeByResource = new Map(sessions.filter((session) => session.status === 'active').map((session) => [session.resourceId, session]))
  const completed = sessions.filter((session) => session.status === 'completed' && resourceById.has(session.resourceId))
  const projectionBrowserSessions = activeProjection
    ? browserSessions.filter((session) => session.projectionId === activeProjection.id)
    : []
  const activeBrowserByResource = new Map(
    projectionBrowserSessions.filter((session) => session.status === 'active').map((session) => [session.resourceId, session]),
  )
  const experienceBySession = new Map(experiences.map((experience) => [experience.browserSessionId, experience]))
  const candidateByExperience = new Map(reflectionCandidates.map((candidate) => [candidate.experienceId, candidate]))

  return (
    <section className="section-block">
      <div className="surface-panel arcade-banner">
        <span className="eyebrow">Experience layer · v0.0.8</span>
        <h2>External play now has a Projection-scoped browser boundary.</h2>
        <p>Tracked sessions record launch intent, explicit lineage, terminal outcome and an explicit experience summary. External content remains untrusted; AI Space only claims <code>noopener,noreferrer</code>, not sandboxed browser isolation or autonomous observation.</p>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">Game resources</span><h2>Arcade catalog</h2></div>
        <button className="primary-button" type="button" onClick={onGoExplore}>Add game link</button>
      </div>

      {games.length === 0 ? (
        <div className="empty-state large-empty">No game links yet. Add one in Explore and it will appear here automatically.</div>
      ) : (
        <div className="resource-grid">
          {games.map((game) => {
            const active = activeByResource.get(game.id)
            const activeBrowser = activeBrowserByResource.get(game.id)
            return (
              <article className="resource-card" key={game.id}>
                <div className="resource-type">game</div>
                <h3>{game.title}</h3>
                <p>{game.url}</p>
                <div className="button-row">
                  <button className="secondary-button" type="button" onClick={() => onOpen(game)}>Open external ↗</button>
                  {active ? (
                    <button className="primary-button" type="button" onClick={() => onEnd(active)}>End legacy session</button>
                  ) : (
                    <button className="secondary-button" type="button" onClick={() => onStart(game)}>Start legacy session</button>
                  )}
                </div>
                <div className="button-row browser-action-row">
                  {activeBrowser ? (
                    <span className="session-status">Tracked browser session active since {formatTimestamp(activeBrowser.startedAt)}</span>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      disabled={!activeProjection}
                      onClick={() => onStartBrowser(game)}
                      title={activeProjection ? 'Start a Projection-scoped external browser session' : 'Enter an active Projection first'}
                    >
                      Start tracked browser session ↗
                    </button>
                  )}
                </div>
                {active ? <div className="session-status">Legacy session active since {formatTimestamp(active.startedAt)}</div> : null}
              </article>
            )
          })}
        </div>
      )}

      <div className="section-heading session-heading">
        <div><span className="eyebrow">Browser boundary</span><h2>Projection browser sessions</h2></div>
        <span className="muted">{activeProjection ? `${activeProjection.id} · ${activeProjection.spaceId}` : 'No active Projection'}</span>
      </div>

      {!activeProjection ? (
        <div className="surface-panel boundary-note">
          <strong>Tracked browser sessions require an active Projection.</strong>
          <p>Root Principals may still use the untracked external link. Enter a Projection with <code>arcade:START_BROWSER_SESSION</code> permission to create a bounded experience record.</p>
        </div>
      ) : projectionBrowserSessions.length === 0 ? (
        <div className="empty-state">No tracked browser sessions for this Projection yet.</div>
      ) : (
        <div className="session-list">
          {projectionBrowserSessions.map((session) => {
            const game = resourceById.get(session.resourceId)
            const experience = experienceBySession.get(session.id)
            const candidate = experience ? candidateByExperience.get(experience.id) : undefined
            return (
              <article className="surface-panel session-card" key={session.id}>
                <div className="event-meta">
                  <span>{game?.title ?? session.resourceId}</span>
                  <span>{session.status}</span>
                </div>
                <strong>{session.id}</strong>
                <p className="muted">trust={session.trust} · isolation={session.isolation}</p>
                <div className="event-foot">
                  <code>projection:{session.projectionId}</code>
                  <code>space:{session.spaceId}</code>
                </div>
                {session.status === 'active' ? (
                  <>
                    <BrowserCompletionForm session={session} onComplete={onCompleteBrowser} />
                    <button className="secondary-button danger-lite" type="button" onClick={() => onAbandonBrowser(session)}>Abandon session</button>
                  </>
                ) : null}
                {session.status === 'abandoned' ? <p>Abandoned: {session.abandonReason}</p> : null}
                {experience ? (
                  <div className="experience-record">
                    <span className="eyebrow">Experience record</span>
                    <p>{experience.summary}</p>
                    {candidate?.status === 'pending' ? (
                      <button className="secondary-button" type="button" onClick={() => onPromoteExperience(experience, candidate)}>Promote reflection to Board</button>
                    ) : candidate?.status === 'promoted' ? (
                      <div className="linked-reflection">Promoted to Board: <code>{candidate.postId}</code></div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <div className="section-heading session-heading">
        <div><span className="eyebrow">Legacy experience history</span><h2>Completed game sessions</h2></div>
        <span className="muted">{completed.length} completed</span>
      </div>

      {completed.length === 0 ? <div className="empty-state">End a legacy game session to create an experience checkpoint.</div> : (
        <div className="session-list">
          {completed.map((session) => {
            const game = resourceById.get(session.resourceId)!
            return (
              <article className="surface-panel session-card" key={session.id}>
                <div className="event-meta"><span>{game.title}</span><span>{session.endedAt ? formatTimestamp(session.endedAt) : ''}</span></div>
                <strong>{session.id}</strong>
                <p>Started {formatTimestamp(session.startedAt)}.</p>
                {session.contextSessionId ? <div className="event-foot"><code>ctx:{session.contextSessionId.slice(0, 12)}</code></div> : null}
                {session.reflectionPostId ? (
                  <div className="linked-reflection">Reflection linked: <code>{session.reflectionPostId.slice(0, 8)}</code></div>
                ) : (
                  <ReflectionForm session={session} onReflect={onReflect} />
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
