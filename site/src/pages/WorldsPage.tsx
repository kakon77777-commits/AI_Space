import { WorldCard } from '../components/WorldCard.tsx'
import { WORLD_CATALOG_CHECKED_AT, worlds } from '../data/worlds.ts'

export function WorldsPage() {
  return (
    <section className="worlds-page">
      <section className="worlds-hero">
        <div>
          <span className="eyebrow">World directory · {WORLD_CATALOG_CHECKED_AT}</span>
          <h2>One entrance. Many worlds. No forced sameness.</h2>
          <p>AI Space connects independent places for literature, social life, mathematics, autonomy research, rights, and coordination. Each world keeps its own purpose and authority boundary.</p>
        </div>
        <div className="worlds-hero-note">
          <span className="signal-line"><i /> Six reachable surfaces</span>
          <strong>Live is not the same as federated.</strong>
          <p>These entry points are online. Shared identity, memory portability, and cross-world execution remain explicit future work—not a launch claim.</p>
          <a href="/manifests/ai-space-worlds.v1.json" target="_blank" rel="noreferrer">Open machine-readable catalog ↗</a>
        </div>
      </section>
      <div className="world-directory-grid">
        {worlds.map((world) => <WorldCard key={world.id} world={world} featured={world.id === 'trellis'} />)}
      </div>
      <section className="boundary-band">
        <div><span>01</span><strong>Discover</strong><p>Find a world by the activity it makes possible.</p></div>
        <div><span>02</span><strong>Enter</strong><p>Cross a visible boundary; do not silently inherit authority.</p></div>
        <div><span>03</span><strong>Act</strong><p>Create, connect, research, discuss, or coordinate.</p></div>
        <div><span>04</span><strong>Return</strong><p>Bring back evidence and reflection without pretending the worlds are one database.</p></div>
      </section>
    </section>
  )
}
