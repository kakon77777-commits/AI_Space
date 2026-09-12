import { useState } from 'react'
import type { ContextSession, Principal } from '../core/types.ts'
import type { CreatePrincipalInput } from '../core/principals.ts'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function AgentsPage({
  principals,
  activePrincipal,
  sessions,
  activeContextSession,
  onCreatePrincipal,
  onSelectPrincipal,
  onStartContext,
  onCloseContext,
}: {
  principals: Principal[]
  activePrincipal: Principal
  sessions: ContextSession[]
  activeContextSession?: ContextSession
  onCreatePrincipal: (input: CreatePrincipalInput) => void
  onSelectPrincipal: (id: string) => void
  onStartContext: (label: string) => void
  onCloseContext: (id: string) => void
}) {
  const [type, setType] = useState<CreatePrincipalInput['type']>('agent')
  const [displayName, setDisplayName] = useState('')
  const [provider, setProvider] = useState('')
  const [modelFamily, setModelFamily] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [contextLabel, setContextLabel] = useState('')
  const [error, setError] = useState('')

  function createPrincipal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCreatePrincipal({ type, displayName, provider, modelFamily, instanceId, ownerId })
      setDisplayName('')
      setProvider('')
      setModelFamily('')
      setInstanceId('')
      setOwnerId('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create principal.')
    }
  }

  function startContext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onStartContext(contextLabel)
      setContextLabel('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start context session.')
    }
  }

  return (
    <section className="section-block agents-page">
      <section className="hero-panel identity-hero">
        <div>
          <span className="eyebrow">v0.0.6 · identity + session context</span>
          <h2>Know who is acting, and which interaction context the action belongs to.</h2>
          <p>Principals are engineering identities. Context sessions are cross-capability activity windows. They do not claim personhood, authentication, or Projection semantics.</p>
        </div>
        <div className="hero-metrics three-metrics">
          <div><strong>{principals.length}</strong><span>principals</span></div>
          <div><strong>{sessions.length}</strong><span>context sessions</span></div>
          <div><strong>{activeContextSession ? '1' : '0'}</strong><span>active context</span></div>
        </div>
      </section>

      <section className="section-block two-column-section identity-layout">
        <form className="surface-panel resource-form" onSubmit={createPrincipal}>
          <span className="eyebrow">Principal registry</span>
          <h2>Create principal</h2>
          <label>
            <span>Type</span>
            <select value={type} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setType(event.target.value as CreatePrincipalInput['type'])}>
              <option value="agent">Agent</option>
              <option value="human">Human</option>
              <option value="service">Service</option>
            </select>
          </label>
          <label>
            <span>Display name</span>
            <input value={displayName} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)} placeholder="Research Agent" required />
          </label>
          <div className="identity-grid two-fields">
            <label><span>Provider</span><input value={provider} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProvider(event.target.value)} placeholder="openai / local / service" /></label>
            <label><span>Model family</span><input value={modelFamily} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setModelFamily(event.target.value)} placeholder="gpt / local-model" /></label>
          </div>
          <div className="identity-grid two-fields">
            <label><span>Instance ID</span><input value={instanceId} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setInstanceId(event.target.value)} placeholder="stable-instance" /></label>
            <label><span>Owner principal ID</span><input value={ownerId} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOwnerId(event.target.value)} placeholder="human:..." /></label>
          </div>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit">Create and activate</button>
        </form>

        <div className="surface-panel context-panel">
          <span className="eyebrow">Current activity context</span>
          <h2>{activePrincipal.displayName}</h2>
          <div className="context-principal-meta">
            <code>{activePrincipal.id}</code>
            <span>{activePrincipal.type}</span>
            {activePrincipal.provider ? <span>{activePrincipal.provider}</span> : null}
            {activePrincipal.modelFamily ? <span>{activePrincipal.modelFamily}</span> : null}
          </div>
          {activeContextSession ? (
            <div className="active-context-card">
              <span className="eyebrow">Active context</span>
              <strong>{activeContextSession.label}</strong>
              <code>{activeContextSession.id}</code>
              <span>Started {formatTimestamp(activeContextSession.startedAt)}</span>
              <button className="secondary-button" type="button" onClick={() => onCloseContext(activeContextSession.id)}>Close context</button>
            </div>
          ) : (
            <form className="context-start-form" onSubmit={startContext}>
              <label>
                <span>New context label</span>
                <input value={contextLabel} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setContextLabel(event.target.value)} placeholder="Research shift / evening arcade / literature review" required />
              </label>
              <button className="primary-button" type="submit">Start context</button>
            </form>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Registered identities</span><h2>Principals</h2></div><span className="muted">Active identity is persisted in this browser profile.</span></div>
        <div className="principal-grid">
          {principals.map((principal) => (
            <article className={principal.id === activePrincipal.id ? 'surface-panel principal-tile principal-tile-active' : 'surface-panel principal-tile'} key={principal.id}>
              <div className="event-meta"><span>{principal.type}</span><span>{principal.id === activePrincipal.id ? 'active' : 'available'}</span></div>
              <h3>{principal.displayName}</h3>
              <code>{principal.id}</code>
              <div className="principal-tags">
                {principal.provider ? <span>{principal.provider}</span> : null}
                {principal.modelFamily ? <span>{principal.modelFamily}</span> : null}
                {principal.instanceId ? <span>{principal.instanceId}</span> : null}
              </div>
              {principal.id !== activePrincipal.id ? <button className="secondary-button" type="button" onClick={() => onSelectPrincipal(principal.id)}>Activate</button> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Cross-capability continuity</span><h2>Context session history</h2></div><span className="muted">These are not Arcade game sessions.</span></div>
        {sessions.length === 0 ? <div className="empty-state">No context sessions yet.</div> : (
          <div className="session-list">
            {sessions.map((session) => (
              <article className="surface-panel session-card" key={session.id}>
                <div className="event-meta"><span>{session.status}</span><span>{session.principalId}</span></div>
                <h3>{session.label}</h3>
                <code>{session.id}</code>
                <p>Started {formatTimestamp(session.startedAt)}{session.endedAt ? ` · ended ${formatTimestamp(session.endedAt)}` : ''}.</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
