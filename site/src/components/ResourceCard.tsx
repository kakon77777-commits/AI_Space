import type { ExternalResource } from '../core/types.ts'

export function ResourceCard({ resource, onOpen }: { resource: ExternalResource; onOpen: (resource: ExternalResource) => void }) {
  let host = resource.url
  try {
    host = new URL(resource.url).host
  } catch {
    // ResourceStore already validates URLs. Keep the raw URL as a safe fallback label.
  }

  return (
    <article className="resource-card">
      <div className="resource-type">{resource.type}</div>
      <h3>{resource.title}</h3>
      <p>{host}</p>
      <button className="secondary-button" onClick={() => onOpen(resource)} type="button">
        Open external ↗
      </button>
    </article>
  )
}
