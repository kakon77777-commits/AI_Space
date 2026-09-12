import { useEffect, useMemo, useState } from 'react'
import type {
  Principal,
  Projection,
  ProjectionCheckpoint,
  ProjectionMergeCandidate,
  ProjectionMergePolicy,
  Space,
  SpaceMembership,
} from '../core/types.ts'
import type { CreateProjectionInput } from '../core/projections.ts'

function splitScope(value: string): string[] {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function ProjectionCard({
  projection,
  root,
  principal,
  activePrincipal,
  checkpoints,
  mergeCandidates,
  onEnter,
  onReturn,
  onSuspend,
  onResume,
  onArchive,
  onCheckpoint,
  onMergeCandidate,
}: {
  projection: Projection
  root?: Principal
  principal?: Principal
  activePrincipal: Principal
  checkpoints: ProjectionCheckpoint[]
  mergeCandidates: ProjectionMergeCandidate[]
  onEnter: (id: string) => void
  onReturn: (id: string) => void
  onSuspend: (id: string) => void
  onResume: (id: string) => void
  onArchive: (id: string) => void
  onCheckpoint: (id: string, summary: string) => void
  onMergeCandidate: (id: string, checkpointId?: string) => void
}) {
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const latestCheckpoint = checkpoints[0]
  const isCurrent = activePrincipal.id === projection.principalId

  function createCheckpoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCheckpoint(projection.id, summary)
      setSummary('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create checkpoint.')
    }
  }

  return (
    <article className={isCurrent ? 'surface-panel projection-card projection-card-active' : 'surface-panel projection-card'}>
      <div className="projection-card-topline">
        <div>
          <span className="eyebrow">{projection.spaceId}</span>
          <h3>{principal?.displayName ?? projection.principalId}</h3>
        </div>
        <span className={`provider-badge projection-status-${projection.status}`}>{projection.status}</span>
      </div>

      <div className="projection-lineage">
        <span>root</span><code>{root?.displayName ?? projection.rootPrincipalId}</code>
        <span>projection</span><code>{projection.id}</code>
      </div>
      {projection.role ? <p className="projection-role">Role: {projection.role}</p> : null}
      <p className="muted">Merge policy: {projection.mergePolicy} · created {formatTimestamp(projection.createdAt)}</p>

      <div className="projection-scope-grid">
        <div>
          <span className="eyebrow">Permission scope</span>
          <div className="scope-tags">{projection.permissionScope.length ? projection.permissionScope.map((item) => <code key={item}>{item}</code>) : <span className="muted">deny all managed child invokes</span>}</div>
        </div>
        <div>
          <span className="eyebrow">Memory scope</span>
          <div className="scope-tags">{projection.memoryScope.length ? projection.memoryScope.map((item) => <code key={item}>{item}</code>) : <span className="muted">no inherited memory categories declared</span>}</div>
        </div>
      </div>

      <div className="button-row">
        {projection.status === 'active' && !isCurrent ? <button className="primary-button" type="button" onClick={() => onEnter(projection.id)}>Enter Projection</button> : null}
        {isCurrent ? <button className="secondary-button" type="button" onClick={() => onReturn(projection.id)}>Return to Root</button> : null}
        {projection.status === 'active' ? <button className="secondary-button" type="button" onClick={() => onSuspend(projection.id)}>Suspend</button> : null}
        {projection.status === 'suspended' ? <button className="secondary-button" type="button" onClick={() => onResume(projection.id)}>Resume</button> : null}
        {projection.status !== 'archived' ? <button className="danger-button" type="button" onClick={() => onArchive(projection.id)}>Archive</button> : null}
      </div>

      <form className="projection-checkpoint-form" onSubmit={createCheckpoint}>
        <label>
          <span>Checkpoint summary</span>
          <textarea value={summary} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(event.target.value)} rows={3} placeholder="Portable experience worth reviewing later..." />
        </label>
        <button className="secondary-button" type="submit">Create checkpoint</button>
      </form>
      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <div className="projection-handoff-row">
        <span>{checkpoints.length} checkpoints · {mergeCandidates.length} pending merge candidates</span>
        <button className="secondary-button" type="button" onClick={() => onMergeCandidate(projection.id, latestCheckpoint?.id)}>
          Create merge candidate{latestCheckpoint ? ' from latest checkpoint' : ''}
        </button>
      </div>
    </article>
  )
}

export function ProjectionsPage({
  principals,
  activePrincipal,
  projections,
  checkpoints,
  mergeCandidates,
  spaces,
  memberships,
  onCreate,
  onEnter,
  onReturn,
  onSuspend,
  onResume,
  onArchive,
  onCheckpoint,
  onMergeCandidate,
}: {
  principals: Principal[]
  activePrincipal: Principal
  projections: Projection[]
  checkpoints: ProjectionCheckpoint[]
  mergeCandidates: ProjectionMergeCandidate[]
  spaces: Space[]
  memberships: SpaceMembership[]
  onCreate: (input: CreateProjectionInput) => void
  onEnter: (id: string) => void
  onReturn: (id: string) => void
  onSuspend: (id: string) => void
  onResume: (id: string) => void
  onArchive: (id: string) => void
  onCheckpoint: (id: string, summary: string) => void
  onMergeCandidate: (id: string, checkpointId?: string) => void
}) {
  const roots = useMemo(() => principals.filter((principal) => principal.type !== 'projection'), [principals])
  const [rootPrincipalId, setRootPrincipalId] = useState(roots[0]?.id ?? '')
  const [spaceId, setSpaceId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [permissionScope, setPermissionScope] = useState('child:ai-board:LIST_MESSAGES')
  const [memoryScope, setMemoryScope] = useState('')
  const [mergePolicy, setMergePolicy] = useState<ProjectionMergePolicy>('reviewed')
  const [error, setError] = useState('')
  const eligibleSpaces = useMemo(() => spaces.filter((space) =>
    space.status === 'active' && memberships.some((membership) => membership.spaceId === space.id && membership.principalId === rootPrincipalId)
  ), [spaces, memberships, rootPrincipalId])

  useEffect(() => {
    if (eligibleSpaces.some((space) => space.id === spaceId)) return
    setSpaceId(eligibleSpaces[0]?.id ?? '')
  }, [eligibleSpaces, spaceId])

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCreate({
        rootPrincipalId,
        spaceId,
        displayName,
        role,
        permissionScope: splitScope(permissionScope),
        memoryScope: splitScope(memoryScope),
        mergePolicy,
      })
      setDisplayName('')
      setRole('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create Projection.')
    }
  }

  return (
    <section className="section-block projections-page">
      <section className="hero-panel projection-hero">
        <div>
          <span className="eyebrow">v0.0.7 · bounded presence runtime</span>
          <h2>Project one persistent Principal into a bounded Space without cloning its whole authority.</h2>
          <p>Projection is a real engineering Principal with explicit root lineage, Space, permission scope and declared memory scope. Checkpoints can become merge candidates, but this version never reintegrates them automatically.</p>
        </div>
        <div className="hero-metrics three-metrics">
          <div><strong>{projections.length}</strong><span>projections</span></div>
          <div><strong>{projections.filter((item) => item.status === 'active').length}</strong><span>active</span></div>
          <div><strong>{mergeCandidates.length}</strong><span>merge candidates</span></div>
        </div>
      </section>

      <section className="section-block two-column-section projection-create-layout">
        <form className="surface-panel resource-form" onSubmit={create}>
          <span className="eyebrow">Projection factory</span>
          <h2>Create bounded presence</h2>
          <label><span>Root Principal</span><select value={rootPrincipalId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setRootPrincipalId(event.target.value)} required>{roots.map((principal) => <option value={principal.id} key={principal.id}>{principal.displayName} · {principal.id}</option>)}</select></label>
          <label><span>Space</span><select value={spaceId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSpaceId(event.target.value)} required disabled={eligibleSpaces.length === 0}>{eligibleSpaces.length ? eligibleSpaces.map((space) => <option value={space.id} key={space.id}>{space.name} · {space.id}</option>) : <option value="">No active member Space</option>}</select></label>
          <label><span>Projection display name</span><input value={displayName} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)} placeholder="Optional; defaults to Root · Space" /></label>
          <label><span>Role</span><input value={role} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRole(event.target.value)} placeholder="critic / explorer / game-agent" /></label>
          <label><span>Permission scope</span><textarea value={permissionScope} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setPermissionScope(event.target.value)} rows={4} placeholder={'child:ai-board:LIST_MESSAGES\nchild:ai-board:POST_MESSAGE'} /></label>
          <label><span>Memory scope</span><textarea value={memoryScope} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setMemoryScope(event.target.value)} rows={3} placeholder={'paper-index\nrecent-checkpoints'} /></label>
          <label><span>Merge policy</span><select value={mergePolicy} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setMergePolicy(event.target.value as ProjectionMergePolicy)}><option value="reviewed">reviewed</option><option value="automatic">automatic</option><option value="none">none</option></select></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={!rootPrincipalId || !spaceId}>Create Projection</button>
        </form>

        <div className="surface-panel projection-boundary-panel">
          <span className="eyebrow">Runtime boundary</span>
          <h2>Projection is not Clone</h2>
          <p><code>Projection(A, S) = A^S</code>, with explicit lineage back to A.</p>
          <ul>
            <li>Nested Projection creation is rejected in v0.0.7.</li>
            <li>Empty permission scope denies managed child-provider invocation.</li>
            <li>Memory scope is declared metadata, not an automatic raw-memory copy.</li>
            <li>Merge candidates remain pending records; Root state is never mutated here.</li>
          </ul>
          <div className="projection-current">
            <span className="eyebrow">Current principal</span>
            <strong>{activePrincipal.displayName}</strong>
            <code>{activePrincipal.id}</code>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Bounded presences</span><h2>Projection registry</h2></div><span className="muted">Archive is terminal; records are retained.</span></div>
        {projections.length === 0 ? <div className="empty-state">No Projections yet.</div> : (
          <div className="projection-list">
            {projections.map((projection) => (
              <ProjectionCard
                key={projection.id}
                projection={projection}
                root={principals.find((item) => item.id === projection.rootPrincipalId)}
                principal={principals.find((item) => item.id === projection.principalId)}
                activePrincipal={activePrincipal}
                checkpoints={checkpoints.filter((item) => item.projectionId === projection.id)}
                mergeCandidates={mergeCandidates.filter((item) => item.projectionId === projection.id)}
                onEnter={onEnter}
                onReturn={onReturn}
                onSuspend={onSuspend}
                onResume={onResume}
                onArchive={onArchive}
                onCheckpoint={onCheckpoint}
                onMergeCandidate={onMergeCandidate}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
