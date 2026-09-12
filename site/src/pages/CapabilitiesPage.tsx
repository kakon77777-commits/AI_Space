import { useState } from 'react'
import type { CapabilityDispatchPlan, CapabilityRuntimeSnapshot } from '../core/types.ts'
import { ProviderCard } from '../components/ProviderCard.tsx'

function parseJsonInput(value: string): unknown {
  if (!value.trim()) return undefined
  return JSON.parse(value)
}

export function CapabilitiesPage({
  snapshots,
  onProbe,
  onToggle,
  onPreview,
  onInvoke,
}: {
  snapshots: CapabilityRuntimeSnapshot[]
  onProbe: (capabilityId: string) => Promise<void>
  onToggle: (capabilityId: string) => void
  onPreview: (capabilityId: string, action: string, input?: unknown) => CapabilityDispatchPlan
  onInvoke: (capabilityId: string, action: string, input?: unknown) => Promise<{ status: number; data: unknown }>
}) {
  const [actions, setActions] = useState<Record<string, string>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  function selected(snapshot: CapabilityRuntimeSnapshot): string {
    return actions[snapshot.provider.manifest.id] ?? snapshot.provider.manifest.actions[0] ?? ''
  }

  function inputFor(id: string): unknown {
    return parseJsonInput(inputs[id] ?? '')
  }

  async function run(id: string, operation: () => Promise<unknown>) {
    setBusy((current) => ({ ...current, [id]: true }))
    setErrors((current) => ({ ...current, [id]: '' }))
    try {
      const result = await operation()
      if (result !== undefined) setOutputs((current) => ({ ...current, [id]: JSON.stringify(result, null, 2) }))
    } catch (error) {
      setErrors((current) => ({ ...current, [id]: error instanceof Error ? error.message : String(error) }))
    } finally {
      setBusy((current) => ({ ...current, [id]: false }))
    }
  }

  return (
    <>
      <section className="hero-panel runtime-hero">
        <div>
          <span className="eyebrow">v0.0.5 · capability runtime manager</span>
          <h2>Desired capability declarations now have an observable operational runtime.</h2>
          <p>Probe child health, persist enablement, preview deterministic dispatch plans, and invoke API actions through one mother-runtime gate.</p>
        </div>
        <div className="hero-metrics">
          <div><strong>{snapshots.length}</strong><span>registered providers</span></div>
          <div><strong>{snapshots.filter((item) => item.state.enabled).length}</strong><span>enabled</span></div>
          <div><strong>{snapshots.filter((item) => item.state.health === 'healthy').length}</strong><span>healthy</span></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Runtime control plane</span><h2>Child providers</h2></div><span className="muted">Manifest state and observed runtime state are intentionally separate.</span></div>
        {snapshots.length === 0 ? <div className="empty-state">No child capability providers are registered.</div> : (
          <div className="runtime-provider-list">
            {snapshots.map((snapshot) => {
              const id = snapshot.provider.manifest.id
              const action = selected(snapshot)
              return (
                <section className="runtime-provider-block" key={id}>
                  <ProviderCard provider={snapshot.provider} runtime={snapshot.state} busy={busy[id]} onProbe={() => run(id, () => onProbe(id))} onToggle={() => onToggle(id)} />
                  <div className="runtime-console surface-panel">
                    <span className="eyebrow">Dispatch console</span>
                    <label>Action
                      <select value={action} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setActions((current) => ({ ...current, [id]: event.target.value }))}>
                        {snapshot.provider.manifest.actions.map((item) => <option value={item} key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>Input JSON
                      <textarea rows={7} value={inputs[id] ?? ''} placeholder='{"limit": 5}' onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setInputs((current) => ({ ...current, [id]: event.target.value }))} />
                    </label>
                    <div className="button-row">
                      <button className="secondary-button" disabled={!action || busy[id]} onClick={() => run(id, async () => onPreview(id, action, inputFor(id)))}>Preview</button>
                      <button className="primary-button" disabled={!action || !snapshot.state.enabled || busy[id]} onClick={() => run(id, () => onInvoke(id, action, inputFor(id)))}>Invoke</button>
                    </div>
                    {errors[id] ? <p className="provider-error">{errors[id]}</p> : null}
                    {outputs[id] ? <pre className="runtime-output">{outputs[id]}</pre> : <div className="empty-state">Preview or invoke an action to inspect its deterministic plan/result.</div>}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
