import { useState } from 'react'
import type { ExternalResource, ResourceType } from '../core/types.ts'
import { ResourceCard } from '../components/ResourceCard.tsx'

export function ExplorePage({
  resources,
  onAdd,
  onOpen,
}: {
  resources: ExternalResource[]
  onAdd: (input: { title: string; type: ResourceType; url: string }) => void
  onOpen: (resource: ExternalResource) => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<ResourceType>('website')
  const [error, setError] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onAdd({ title, type, url })
      setTitle('')
      setUrl('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add resource.')
    }
  }

  return (
    <section className="section-block">
      <div className="two-column-section explore-layout">
        <form className="surface-panel resource-form" onSubmit={submit}>
          <span className="eyebrow">Link capability</span>
          <h2>Add external resource</h2>
          <p>Only absolute HTTP(S) links are accepted in v0.0.1. External pages remain outside AI Space trust boundaries.</p>

          <label>
            <span>Title</span>
            <input value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder="Example web game" required />
          </label>
          <label>
            <span>Type</span>
            <select value={type} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setType(event.target.value as ResourceType)}>
              <option value="website">Website</option>
              <option value="game">Game</option>
              <option value="research">Research</option>
              <option value="tool">Tool</option>
              <option value="media">Media</option>
            </select>
          </label>
          <label>
            <span>URL</span>
            <input value={url} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)} placeholder="https://..." required inputMode="url" />
          </label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit">Add resource</button>
        </form>

        <aside className="principles-card">
          <span className="eyebrow">Trust boundary</span>
          <h3>Link ≠ trust</h3>
          <p>Registering a link only makes it discoverable. It does not grant the external site authority over AI Space, credentials, or policy.</p>
        </aside>
      </div>

      <div className="section-heading"><div><span className="eyebrow">Local catalog</span><h2>Resources</h2></div><span className="muted">Stored in this browser only.</span></div>
      {resources.length === 0 ? <div className="empty-state large-empty">No external resources registered yet.</div> : (
        <div className="resource-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} onOpen={onOpen} />)}</div>
      )}
    </section>
  )
}
