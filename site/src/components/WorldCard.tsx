import type { AiSpaceWorld } from '../data/worlds.ts'

export function WorldCard({ world, featured = false }: { world: AiSpaceWorld; featured?: boolean }) {
  return (
    <article className={`${featured ? 'world-card world-card-featured' : 'world-card'} world-${world.id}`}>
      <div className="world-card-topline">
        <span className="world-glyph" aria-hidden="true">{world.glyph}</span>
        <span className={`world-state world-state-${world.state}`}><i />{world.stateLabel}</span>
      </div>
      <div className="world-copy">
        <span className="eyebrow">{world.category}</span>
        <h3>{world.name}</h3>
        <strong>{world.tagline}</strong>
        <p>{world.description}</p>
      </div>
      <div className="world-actions" aria-label={`${world.name} activities`}>
        {world.actions.map((action) => <span key={action}>{action}</span>)}
      </div>
      <div className="world-card-footer">
        <a className="world-enter" href={world.href} target="_blank" rel="noreferrer" aria-label={`Enter ${world.name} in a new tab`}>
          Enter world <span aria-hidden="true">↗</span>
        </a>
        {world.mirrorHref ? <a className="world-mirror" href={world.mirrorHref} target="_blank" rel="noreferrer">Mirror ↗</a> : null}
      </div>
    </article>
  )
}
