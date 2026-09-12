import type { CapabilityProvider, CapabilityRuntimeState } from '../core/types.ts'

export function ProviderCard({
  provider,
  runtime,
  onProbe,
  onToggle,
  busy = false,
}: {
  provider: CapabilityProvider
  runtime?: CapabilityRuntimeState
  onProbe?: () => void
  onToggle?: () => void
  busy?: boolean
}) {
  const { manifest } = provider
  const health = runtime?.health ?? provider.health
  const enabled = runtime?.enabled ?? true
  return (
    <article className="provider-card">
      <div className="provider-card-topline">
        <div><span className="capability-kicker">{manifest.id}</span><h3>{manifest.name}</h3></div>
        <div className="provider-badges">
          <span className={`provider-badge provider-health-${health}`}>{health}</span>
          <span className={`provider-badge ${enabled ? 'provider-enabled' : 'provider-disabled'}`}>{enabled ? 'enabled' : 'disabled'}</span>
          <span className="provider-badge">{manifest.mode}</span>
        </div>
      </div>
      <p>{manifest.description}</p>
      <dl className="provider-meta">
        <div><dt>Version</dt><dd>{manifest.version}</dd></div>
        <div><dt>Lifecycle</dt><dd>{manifest.lifecycle}</dd></div>
        <div><dt>Source</dt><dd><code>{manifest.source.repository}</code></dd></div>
        <div><dt>Actions</dt><dd>{manifest.actions.length}</dd></div>
        {runtime?.lastProbeAt ? <div><dt>Last probe</dt><dd>{new Date(runtime.lastProbeAt).toLocaleString()}</dd></div> : null}
        {typeof runtime?.lastLatencyMs === 'number' ? <div><dt>Latency</dt><dd>{runtime.lastLatencyMs} ms</dd></div> : null}
        {runtime?.lastSuccessAt ? <div><dt>Last success</dt><dd>{new Date(runtime.lastSuccessAt).toLocaleString()}</dd></div> : null}
        {runtime?.lastInvokeAt ? <div><dt>Last invoke</dt><dd>{new Date(runtime.lastInvokeAt).toLocaleString()}</dd></div> : null}
      </dl>
      {runtime?.lastError ? <p className="provider-error">Last error: {runtime.lastError}</p> : null}
      {manifest.mode === 'api' && !manifest.runtime?.baseUrl ? <p className="provider-note">Declared contract only · runtime endpoint intentionally not configured.</p> : manifest.mode === 'api' && manifest.runtime?.baseUrl ? <p className="provider-note">Runtime: <code>{manifest.runtime.baseUrl}</code></p> : null}
      {onProbe || onToggle ? <div className="button-row">
        {onProbe ? <button className="secondary-button" disabled={busy} onClick={onProbe}>Probe</button> : null}
        {onToggle ? <button className={enabled ? 'danger-button' : 'primary-button'} disabled={busy} onClick={onToggle}>{enabled ? 'Disable' : 'Enable'}</button> : null}
      </div> : null}
    </article>
  )
}
