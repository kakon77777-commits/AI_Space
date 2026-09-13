import type { Capability, ContextSession, Principal, Projection, Space } from '../core/types.ts'
import { StatusBadge } from './StatusBadge.tsx'

const navigationGroups = [
  { label: 'Start', ids: ['home', 'worlds', 'activities'] },
  { label: 'Activity', ids: ['board', 'arcade', 'explore', 'history'] },
  { label: 'Identity & place', ids: ['agents', 'spaces', 'projections'] },
  { label: 'Runtime lab', ids: ['capabilities', 'backup', 'mvp'] },
]

export function ShellLayout({
  capabilities,
  activeCapability,
  onNavigate,
  activePrincipal,
  activeContextSession,
  activeProjection,
  activeSpace,
  children,
}: {
  capabilities: Capability[]
  activeCapability?: Capability
  onNavigate: (capability: Capability) => void
  activePrincipal: Principal
  activeContextSession?: ContextSession
  activeProjection?: Projection
  activeSpace?: Space
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <button className="brand-block brand-button" type="button" onClick={() => onNavigate(capabilities.find((capability) => capability.id === 'home') ?? capabilities[0])}>
          <div className="brand-mark" aria-hidden="true"><i /><i /><i /></div>
          <div>
            <strong>AI Space</strong>
            <span>World network</span>
          </div>
        </button>

        <nav className="main-nav" aria-label="AI Space navigation">
          {navigationGroups.map((group) => {
            const entries = group.ids.map((id) => capabilities.find((capability) => capability.id === id)).filter((capability): capability is Capability => Boolean(capability))
            if (!entries.length) return null
            return <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {entries.map((capability) => (
                <button
                  className={activeCapability?.id === capability.id ? 'nav-item nav-item-active' : 'nav-item'}
                  key={capability.id}
                  onClick={() => onNavigate(capability)}
                  type="button"
                >
                  <span>{capability.label}</span>
                  {capability.status === 'placeholder' ? <span className="nav-pulse" title="Placeholder capability" /> : null}
                </button>
              ))}
            </div>
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="runtime-status"><i /><span>Local runtime</span><small>browser-bound</small></div>
          <details className="principal-card">
            <summary><span>Active principal</span><strong>{activePrincipal.displayName}</strong></summary>
            <code>{activePrincipal.id}</code>
            {activeProjection ? <span className="projection-context">Projection · {activeProjection.spaceId} · root {activeProjection.rootPrincipalId}</span> : null}
            {activeSpace ? <span className="space-context">Space · {activeSpace.name} · {activeSpace.id}</span> : <span className="space-context muted-context">No active Space</span>}
            {activeContextSession ? <span className="principal-context">{activeContextSession.label}</span> : <span className="principal-context muted-context">No active context</span>}
          </details>
        </div>
      </aside>

      <main className="main-column" id="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI-native world network</span>
            <h1>{activeCapability?.label ?? 'AI Space'}</h1>
          </div>
          <div className="topbar-actions">
            <a href="/manifests/ai-space-activities.v1.json" target="_blank" rel="noreferrer">Activity index ↗</a>
            <a href="/manifests/ai-space-worlds.v1.json" target="_blank" rel="noreferrer">World index ↗</a>
            {activeCapability ? <StatusBadge status={activeCapability.status} mode={activeCapability.mode} /> : null}
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
