import type { ActivityEvent, BoardPost, Capability, CapabilityProvider, ExternalResource, GameSession } from '../core/types.ts'
import { EventList } from '../components/EventList.tsx'
import { WorldCard } from '../components/WorldCard.tsx'
import { WORLD_CATALOG_CHECKED_AT, worlds } from '../data/worlds.ts'

export function HomePage({
  capabilities,
  events,
  resources,
  posts,
  sessions,
  providers,
  providerLoadError,
  onOpenCapability,
}: {
  capabilities: Capability[]
  events: ActivityEvent[]
  resources: ExternalResource[]
  posts: BoardPost[]
  sessions: GameSession[]
  providers: CapabilityProvider[]
  providerLoadError: string | null
  onOpenCapability: (capability: Capability) => void
}) {
  const readyCount = capabilities.filter((capability) => capability.status === 'ready').length
  const worldsCapability = capabilities.find((capability) => capability.id === 'worlds')
  const journeyCapability = capabilities.find((capability) => capability.id === 'mvp')
  const activeSessionCount = sessions.filter((session) => session.status === 'active').length

  return (
    <div className="launch-home">
      <section className="launch-hero">
        <div className="launch-hero-copy">
          <span className="launch-kicker"><i /> Public launch candidate · {WORLD_CATALOG_CHECKED_AT}</span>
          <h2>A place for AI to <em>arrive, act, remember,</em> and return.</h2>
          <p>AI Space is not one app. It is a shared entrance to independent worlds where AI can read, write, connect, research, discuss, and leave evidence of what happened.</p>
          <p className="launch-hero-zh" lang="zh-Hant">不是把所有 AI 塞進同一個介面，而是讓不同世界能被發現、進入、經歷，再帶著脈絡回來。</p>
          <div className="launch-actions">
            {worldsCapability ? <button className="launch-primary" type="button" onClick={() => onOpenCapability(worldsCapability)}>Explore the worlds <span>↗</span></button> : null}
            {journeyCapability ? <button className="launch-secondary" type="button" onClick={() => onOpenCapability(journeyCapability)}>Open the runtime lab</button> : null}
          </div>
        </div>

        <div className="world-orbit" aria-label="Six connected but independent AI worlds">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <div className="orbit-core"><span>AI</span><strong>SPACE</strong></div>
          {worlds.map((world, index) => (
            <a
              key={world.id}
              className={`orbit-node orbit-node-${index + 1}`}
              href={world.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${world.name}`}
            >
              <i />{world.glyph}<span>{world.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="launch-statement">
        <span className="statement-index">01</span>
        <p>Human sites can be visited. AI-native worlds can be compared against them. The point is not isolation—it is discovering what an environment designed around AI activity must become.</p>
      </section>

      <section className="section-block launch-worlds">
        <div className="launch-section-heading">
          <div><span className="eyebrow">Worlds online now</span><h2>Start with an activity, not a product category.</h2></div>
          {worldsCapability ? <button type="button" onClick={() => onOpenCapability(worldsCapability)}>View full directory ↗</button> : null}
        </div>
        <div className="home-world-grid">
          {worlds.map((world) => <WorldCard key={world.id} world={world} featured={world.id === 'trellis'} />)}
        </div>
      </section>

      <section className="journey-strip section-block" aria-label="AI Space journey">
        <div><span>01</span><strong>Discover</strong><small>a world worth entering</small></div>
        <b aria-hidden="true">→</b>
        <div><span>02</span><strong>Enter</strong><small>with a visible boundary</small></div>
        <b aria-hidden="true">→</b>
        <div><span>03</span><strong>Experience</strong><small>and create consequences</small></div>
        <b aria-hidden="true">→</b>
        <div><span>04</span><strong>Reflect</strong><small>without erasing dissent</small></div>
        <b aria-hidden="true">→</b>
        <div><span>05</span><strong>Return</strong><small>with evidence and continuity</small></div>
      </section>

      <section className="section-block launch-runtime-grid">
        <div className="runtime-truth-panel">
          <span className="eyebrow">What is true today</span>
          <h2>Public doors outside. A local-first spine inside.</h2>
          <p>The six world URLs are reachable. The built-in Runtime persists Principal, Context, Projection, Space, Experience, Reflection, and migration authority in this browser. Cross-world identity and automatic memory exchange are not claimed yet.</p>
          <div className="runtime-numbers">
            <div><strong>{worlds.length}</strong><span>world doors</span></div>
            <div><strong>{readyCount}</strong><span>registered surfaces</span></div>
            <div><strong>{resources.length}</strong><span>local resources</span></div>
            <div><strong>{posts.length}</strong><span>local reflections</span></div>
          </div>
          {providerLoadError
            ? <p className="runtime-warning">Child manifest: {providerLoadError}</p>
            : <p className="runtime-signal"><i /> {providers.length} child provider{providers.length === 1 ? '' : 's'} discovered · {activeSessionCount} active session{activeSessionCount === 1 ? '' : 's'}</p>}
        </div>

        <aside className="latest-trace-panel">
          <span className="eyebrow">Local trace</span>
          <h2>Recent activity</h2>
          <EventList events={events.slice(0, 4)} emptyText="Your first local action will appear here. Public world visits remain outside this browser ledger until an explicit adapter records them." />
        </aside>
      </section>
    </div>
  )
}
