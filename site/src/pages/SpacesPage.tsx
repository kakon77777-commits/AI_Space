import { useEffect, useMemo, useState } from 'react'
import type {
  ActivityEvent,
  ExternalResource,
  Principal,
  Projection,
  Space,
  SpaceMembership,
  SpacePresence,
  SpaceResourceRef,
  SpaceVisibility,
} from '../core/types.ts'
import { EventList } from '../components/EventList.tsx'
import { selectSpaceEvents } from '../core/spaces.ts'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function SpacesPage({
  spaces,
  memberships,
  presences,
  resourceRefs,
  resources,
  events,
  principals,
  activePrincipal,
  activeProjection,
  activeSpace,
  onCreate,
  onEnter,
  onLeave,
  onAddMember,
  onRemoveMember,
  onArchive,
  onAddResource,
}: {
  spaces: Space[]
  memberships: SpaceMembership[]
  presences: SpacePresence[]
  resourceRefs: SpaceResourceRef[]
  resources: ExternalResource[]
  events: ActivityEvent[]
  principals: Principal[]
  activePrincipal: Principal
  activeProjection?: Projection
  activeSpace?: Space
  onCreate: (input: { name: string; description?: string; visibility: SpaceVisibility }) => void
  onEnter: (spaceId: string) => void
  onLeave: () => void
  onAddMember: (spaceId: string, principalId: string) => void
  onRemoveMember: (spaceId: string, principalId: string) => void
  onArchive: (spaceId: string) => void
  onAddResource: (spaceId: string, resourceId: string) => void
}) {
  const activeSpaces = spaces.filter((space) => space.status === 'active')
  const [selectedSpaceId, setSelectedSpaceId] = useState(activeSpace?.id ?? activeSpaces[0]?.id ?? spaces[0]?.id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<SpaceVisibility>('shared')
  const [memberId, setMemberId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedSpaceId && spaces.some((space) => space.id === selectedSpaceId)) return
    setSelectedSpaceId(activeSpace?.id ?? activeSpaces[0]?.id ?? spaces[0]?.id ?? '')
  }, [selectedSpaceId, spaces, activeSpace?.id, activeSpaces])

  const selected = spaces.find((space) => space.id === selectedSpaceId)
  const selectedMemberships = memberships.filter((membership) => membership.spaceId === selectedSpaceId)
  const selectedPresences = presences.filter((presence) => presence.spaceId === selectedSpaceId)
  const selectedRefs = resourceRefs.filter((ref) => ref.spaceId === selectedSpaceId)
  const selectedEvents = useMemo(() => selectSpaceEvents(events, selectedSpaceId), [events, selectedSpaceId])
  const rootPrincipals = principals.filter((principal) => principal.type !== 'projection')
  const eligibleMembers = rootPrincipals.filter((principal) => !selectedMemberships.some((membership) => membership.principalId === principal.id))
  const eligibleResources = resources.filter((resource) => !selectedRefs.some((ref) => ref.resourceId === resource.id))
  const activePresence = presences.find((presence) => presence.principalId === activePrincipal.id)
  const selectedMembership = selectedMemberships.find((membership) => membership.principalId === activePrincipal.id)
  const isOwner = selected?.ownerPrincipalId === activePrincipal.id
  const canRootEnter = activePrincipal.type !== 'projection' && selected?.status === 'active' && Boolean(selectedMembership)
  const canAttachResource = Boolean(selected && (
    activePrincipal.type === 'projection'
      ? activePresence?.spaceId === selected.id
      : selectedMembership
  ))

  useEffect(() => {
    setMemberId(eligibleMembers[0]?.id ?? '')
  }, [selectedSpaceId, eligibleMembers.map((principal) => principal.id).join('|')])

  useEffect(() => {
    setResourceId(eligibleResources[0]?.id ?? '')
  }, [selectedSpaceId, eligibleResources.map((resource) => resource.id).join('|')])

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCreate({ name, description, visibility })
      setName('')
      setDescription('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create Space.')
    }
  }

  function run(action: () => void) {
    try {
      action()
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Space action failed.')
    }
  }

  return (
    <section className="section-block spaces-page">
      <section className="hero-panel space-hero">
        <div>
          <span className="eyebrow">v0.0.9 · shared local context runtime</span>
          <h2>Make Space an authoritative runtime object instead of a free-form lineage string.</h2>
          <p>Membership, active presence, resource references and history projection all point back to the same persistent Space. “Shared” here means shared among registered local root Principals only.</p>
        </div>
        <div className="hero-metrics four-metrics">
          <div><strong>{spaces.length}</strong><span>spaces</span></div>
          <div><strong>{spaces.filter((space) => space.visibility === 'shared').length}</strong><span>shared</span></div>
          <div><strong>{presences.length}</strong><span>presences</span></div>
          <div><strong>{resourceRefs.length}</strong><span>resource refs</span></div>
        </div>
      </section>

      <section className="two-column-section space-control-grid">
        <form className="surface-panel resource-form" onSubmit={submitCreate}>
          <span className="eyebrow">Space factory</span>
          <h2>Create local Space</h2>
          {activePrincipal.type === 'projection' ? <p className="muted">Return to a Root Principal before creating a Space.</p> : null}
          <label><span>Name</span><input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} placeholder="Simulation Lab" required /></label>
          <label><span>Description</span><textarea value={description} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} rows={3} placeholder="Optional purpose / boundary." /></label>
          <label><span>Visibility</span><select value={visibility} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setVisibility(event.target.value as SpaceVisibility)}><option value="shared">shared (local members)</option><option value="private">private (owner only)</option></select></label>
          <button className="primary-button" type="submit" disabled={activePrincipal.type === 'projection'}>Create Space</button>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
        </form>

        <div className="surface-panel space-boundary-panel">
          <span className="eyebrow">Current context</span>
          <h2>{activeSpace ? activeSpace.name : 'No active Space'}</h2>
          <code>{activeSpace?.id ?? '—'}</code>
          <p>{activeProjection ? `Projection ${activeProjection.id} is bound to ${activeProjection.spaceId}.` : 'Root Principals may explicitly enter one member Space at a time.'}</p>
          <ul>
            <li>Space history is filtered from the global Event Store.</li>
            <li>Space resources are references to canonical ResourceStore objects.</li>
            <li>No public/federated membership or realtime synchronization exists in v0.0.9.</li>
          </ul>
          {activePresence && activePrincipal.type !== 'projection' ? <button className="secondary-button" type="button" onClick={() => run(onLeave)}>Leave current Space</button> : null}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Authoritative contexts</span><h2>Space registry</h2></div><span className="muted">Archive keeps history and refs but blocks new entry.</span></div>
        <div className="space-grid">
          {spaces.map((space) => {
            const memberCount = memberships.filter((membership) => membership.spaceId === space.id).length
            const presenceCount = presences.filter((presence) => presence.spaceId === space.id).length
            const refCount = resourceRefs.filter((ref) => ref.spaceId === space.id).length
            return (
              <button key={space.id} type="button" className={selectedSpaceId === space.id ? 'surface-panel space-card space-card-active' : 'surface-panel space-card'} onClick={() => setSelectedSpaceId(space.id)}>
                <span className="eyebrow">{space.visibility} · {space.status}</span>
                <strong>{space.name}</strong>
                <code>{space.id}</code>
                <span>{memberCount} members · {presenceCount} present · {refCount} resources</span>
              </button>
            )
          })}
        </div>
      </section>

      {selected ? (
        <section className="section-block two-column-section space-detail-grid">
          <div className="surface-panel space-detail-panel">
            <div className="section-heading"><div><span className="eyebrow">Selected Space</span><h2>{selected.name}</h2></div><span className={`provider-badge projection-status-${selected.status}`}>{selected.status}</span></div>
            <p>{selected.description ?? 'No description.'}</p>
            <div className="provider-meta">
              <div><dt>Space ID</dt><dd><code>{selected.id}</code></dd></div>
              <div><dt>Owner</dt><dd><code>{selected.ownerPrincipalId}</code></dd></div>
              <div><dt>Created</dt><dd>{formatTimestamp(selected.createdAt)}</dd></div>
              <div><dt>Visibility</dt><dd>{selected.visibility}</dd></div>
            </div>

            <div className="button-row space-entry-row">
              {canRootEnter && activePresence?.spaceId !== selected.id && !activePresence ? <button className="primary-button" type="button" onClick={() => run(() => onEnter(selected.id))}>Enter Space</button> : null}
              {activePresence?.spaceId === selected.id && activePrincipal.type !== 'projection' ? <button className="secondary-button" type="button" onClick={() => run(onLeave)}>Leave Space</button> : null}
              {activePresence && activePresence.spaceId !== selected.id && activePrincipal.type !== 'projection' ? <span className="muted">Leave {activePresence.spaceId} before entering this Space.</span> : null}
              {activePrincipal.type === 'projection' ? <span className="muted">Projection presence is controlled through Projection Enter/Return.</span> : null}
            </div>

            <div className="space-members-block">
              <span className="eyebrow">Members</span>
              <div className="space-member-list">
                {selectedMemberships.map((membership) => {
                  const principal = principals.find((item) => item.id === membership.principalId)
                  return <div key={`${membership.spaceId}:${membership.principalId}`} className="space-member-row"><span><strong>{principal?.displayName ?? membership.principalId}</strong><small>{membership.role}</small></span>{isOwner && membership.role !== 'owner' ? <button className="danger-button" type="button" onClick={() => run(() => onRemoveMember(selected.id, membership.principalId))}>Remove</button> : null}</div>
                })}
              </div>
              {isOwner && selected.visibility === 'shared' && selected.status === 'active' && eligibleMembers.length ? <div className="space-inline-form"><select value={memberId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setMemberId(event.target.value)}>{eligibleMembers.map((principal) => <option key={principal.id} value={principal.id}>{principal.displayName} · {principal.id}</option>)}</select><button className="secondary-button" type="button" disabled={!memberId} onClick={() => run(() => onAddMember(selected.id, memberId))}>Add member</button></div> : null}
            </div>

            {isOwner && selected.status === 'active' ? <button className="danger-button" type="button" onClick={() => run(() => onArchive(selected.id))}>Archive Space</button> : null}
          </div>

          <div className="space-side-column">
            <div className="surface-panel">
              <span className="eyebrow">Shared resource references</span>
              <h2>Resources</h2>
              {selectedRefs.length === 0 ? <div className="empty-state">No resources linked to this Space.</div> : <div className="space-resource-list">{selectedRefs.map((ref) => { const resource = resources.find((item) => item.id === ref.resourceId); return <div className="space-resource-row" key={ref.id}><strong>{resource?.title ?? ref.resourceId}</strong><span>{resource?.type ?? 'missing resource'} · added by {ref.addedByPrincipalId}</span></div> })}</div>}
              {canAttachResource && selected.status === 'active' && eligibleResources.length ? <div className="space-inline-form"><select value={resourceId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setResourceId(event.target.value)}>{eligibleResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title} · {resource.type}</option>)}</select><button className="secondary-button" type="button" disabled={!resourceId} onClick={() => run(() => onAddResource(selected.id, resourceId))}>Attach resource ref</button></div> : null}
            </div>

            <div className="surface-panel">
              <span className="eyebrow">Global history projection</span>
              <h2>Space activity</h2>
              <EventList events={selectedEvents} emptyText="No events recorded for this Space yet." />
            </div>
          </div>
        </section>
      ) : null}
    </section>
  )
}
