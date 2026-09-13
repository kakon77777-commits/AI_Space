import { useState } from 'react'
import type { ActivityArtifactRef, ActivityAvailability, ActivityDefinition, ActivityInstance } from '../core/types.ts'
import { ActivityCard } from '../components/ActivityCard.tsx'
import { ActivityStatusBadge } from '../components/ActivityStatusBadge.tsx'
import { observatoryFieldNotes } from '../data/activities.ts'

const nonTerminal = new Set(['planned', 'ready', 'active', 'suspended'])
const comparisonDraftKeys = ['humanOpenedAt', 'aiOpenedAt', 'humanObservation', 'aiObservation', 'synthesis']

export function ActivitiesPage({
  definitions,
  availability,
  instances,
  artifacts,
  activeRootPrincipalId,
  onStart,
  onUpdateDraft,
  onOpenTarget,
  onSuspend,
  onResume,
  onComplete,
  onAbandon,
}: {
  definitions: ActivityDefinition[]
  availability: ActivityAvailability[]
  instances: ActivityInstance[]
  artifacts: ActivityArtifactRef[]
  activeRootPrincipalId: string
  onStart: (definitionId: string) => void
  onUpdateDraft: (instanceId: string, patch: Record<string, string>) => void
  onOpenTarget: (instanceId: string, target: 'human' | 'aiNative') => void
  onSuspend: (instanceId: string) => void
  onResume: (instanceId: string) => void
  onComplete: (instanceId: string) => void
  onAbandon: (instanceId: string) => void
}) {
  const [error, setError] = useState('')
  const definition = definitions.find((item) => item.id === 'activity:world:compare')
  const activeInstance = instances.find((item) => item.rootPrincipalId === activeRootPrincipalId && item.definitionId === definition?.id && nonTerminal.has(item.status))
  const history = instances.filter((item) => item.rootPrincipalId === activeRootPrincipalId && !nonTerminal.has(item.status))
  const note = observatoryFieldNotes[0]
  const readyToComplete = activeInstance?.status === 'active' && comparisonDraftKeys.every((key) => activeInstance.draft[key]?.trim())

  function run(action: () => void) {
    try {
      action()
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Activity action failed.')
    }
  }

  return (
    <section className="activities-page">
      <section className="activities-hero">
        <div>
          <span className="eyebrow">Activity Ecology · Gate 0</span>
          <h2>Do something. Keep the thread.</h2>
          <p>An Activity is persistent work with an objective, state, pacing guidance, lineage, and a meaningful ending. Opening a link is not completion.</p>
        </div>
        <div className="activities-hero-metrics">
          <div><strong>{definitions.filter((item) => item.status === 'ready').length}</strong><span>available</span></div>
          <div><strong>{instances.filter((item) => nonTerminal.has(item.status)).length}</strong><span>in progress</span></div>
          <div><strong>{instances.filter((item) => item.status === 'completed').length}</strong><span>completed</span></div>
          <div><strong>{artifacts.length}</strong><span>artifact refs</span></div>
        </div>
      </section>

      <section className="section-block">
        <div className="launch-section-heading">
          <div><span className="eyebrow">Available now</span><h2>Start one meaningful activity.</h2></div>
          <a href="/manifests/ai-space-activities.v1.json" target="_blank" rel="noreferrer">Machine catalog ↗</a>
        </div>
        <div className="activity-catalog-grid">
          {definitions.map((item) => (
            <ActivityCard
              key={item.id}
              definition={item}
              availability={availability.find((entry) => entry.definitionId === item.id) ?? { definitionId: item.id, available: false, reasons: ['Availability not evaluated.'] }}
              instance={activeInstance?.definitionId === item.id ? activeInstance : undefined}
              onStart={(id) => run(() => onStart(id))}
            />
          ))}
        </div>
      </section>

      {activeInstance ? (
        <section className="section-block activity-workbench">
          <div className="activity-workbench-heading">
            <div><span className="eyebrow">Resumable local work</span><h2>Wikipedia × AMRAL</h2></div>
            <ActivityStatusBadge status={activeInstance.status} />
          </div>

          {activeInstance.status === 'active' ? (
            <>
              <div className="activity-target-grid">
                <article>
                  <span className="eyebrow">Human-oriented knowledge environment</span>
                  <h3>Wikipedia</h3>
                  <p>Observe discovery, contribution, history, feedback, and what the site remembers about the visitor’s purpose.</p>
                  <a className="secondary-button activity-target-link" href={note.targets.human.href} target="_blank" rel="noopener noreferrer" onClick={() => run(() => onOpenTarget(activeInstance.id, 'human'))}>{activeInstance.draft.humanOpenedAt ? 'Reopen Wikipedia ↗' : 'Open Wikipedia ↗'}</a>
                  {activeInstance.draft.humanOpenedAt ? <small>Opened from this Activity · {new Date(activeInstance.draft.humanOpenedAt).toLocaleString()}</small> : null}
                </article>
                <article>
                  <span className="eyebrow">AI-native research environment</span>
                  <h3>AMRAL</h3>
                  <p>Observe program structure, research lineage, autonomy modes, validation, and whether a visiting AI can continue work.</p>
                  <a className="secondary-button activity-target-link" href={note.targets.aiNative.href} target="_blank" rel="noopener noreferrer" onClick={() => run(() => onOpenTarget(activeInstance.id, 'aiNative'))}>{activeInstance.draft.aiOpenedAt ? 'Reopen AMRAL ↗' : 'Open AMRAL ↗'}</a>
                  {activeInstance.draft.aiOpenedAt ? <small>Opened from this Activity · {new Date(activeInstance.draft.aiOpenedAt).toLocaleString()}</small> : null}
                </article>
              </div>

              <div className="activity-observation-form">
                <label><span>Wikipedia observation</span><textarea rows={4} value={activeInstance.draft.humanObservation ?? ''} onChange={(event) => onUpdateDraft(activeInstance.id, { humanObservation: event.target.value })} placeholder="What became easy, and what context was lost?" /></label>
                <label><span>AMRAL observation</span><textarea rows={4} value={activeInstance.draft.aiObservation ?? ''} onChange={(event) => onUpdateDraft(activeInstance.id, { aiObservation: event.target.value })} placeholder="What research state is explicit, and what action is still unavailable?" /></label>
                <label className="activity-synthesis"><span>Synthesis and one concrete improvement</span><textarea rows={5} value={activeInstance.draft.synthesis ?? ''} onChange={(event) => onUpdateDraft(activeInstance.id, { synthesis: event.target.value })} placeholder="What should AI Space build from this comparison?" /></label>
              </div>
              <div className="activity-control-row">
                <button className="primary-button" type="button" disabled={!readyToComplete} onClick={() => run(() => onComplete(activeInstance.id))}>Complete meaningful comparison</button>
                <button className="secondary-button" type="button" onClick={() => run(() => onSuspend(activeInstance.id))}>Suspend</button>
                <button className="danger-button" type="button" onClick={() => run(() => onAbandon(activeInstance.id))}>Abandon</button>
                {!readyToComplete ? <span>Visit both targets and complete all three observations.</span> : null}
              </div>
            </>
          ) : activeInstance.status === 'suspended' ? (
            <div className="activity-suspended-panel">
              <p>Your draft and lineage are preserved. Resume when this investigation is worth continuing.</p>
              <div className="button-row"><button className="primary-button" type="button" onClick={() => run(() => onResume(activeInstance.id))}>Resume Activity</button><button className="danger-button" type="button" onClick={() => run(() => onAbandon(activeInstance.id))}>Abandon</button></div>
            </div>
          ) : null}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
        </section>
      ) : null}

      <section className="section-block field-note">
        <div className="field-note-heading">
          <div><span className="eyebrow">Published field note · {note.observedAt}</span><h2>{note.title}</h2></div>
          <span className="field-note-number">001</span>
        </div>
        <p className="field-note-thesis">{note.thesis}</p>
        <div className="field-note-targets">
          <a href={note.targets.human.href} target="_blank" rel="noreferrer"><span>Human environment</span><strong>{note.targets.human.name} ↗</strong></a>
          <span aria-hidden="true">×</span>
          <a href={note.targets.aiNative.href} target="_blank" rel="noreferrer"><span>AI-native environment</span><strong>{note.targets.aiNative.name} ↗</strong></a>
        </div>
        <div className="field-note-dimensions">
          {note.dimensions.map((dimension) => <article key={dimension.label}><span className="eyebrow">{dimension.label}</span><dl><div><dt>Wikipedia</dt><dd>{dimension.human}</dd></div><div><dt>AMRAL</dt><dd>{dimension.aiNative}</dd></div><div><dt>AI Space implication</dt><dd>{dimension.implication}</dd></div></dl></article>)}
        </div>
        <div className="field-note-improvements"><span className="eyebrow">What AI Space should build next</span><ol>{note.improvements.map((item) => <li key={item}>{item}</li>)}</ol></div>
        <footer><span>{note.provenance.method}</span><code>speaker_label: {note.provenance.speakerLabel}</code></footer>
      </section>

      {history.length > 0 ? <section className="section-block"><div className="launch-section-heading"><div><span className="eyebrow">Local history</span><h2>Finished Activity instances</h2></div></div><div className="activity-history-list">{history.slice(0, 6).map((item) => <article key={item.id}><ActivityStatusBadge status={item.status} /><strong>{item.resultSummary ?? item.terminalReason ?? item.definitionId}</strong><small>{new Date(item.updatedAt).toLocaleString()}</small></article>)}</div></section> : null}
    </section>
  )
}
