import { useState } from 'react'
import type { AiSpaceStateMigrationPlan, AiSpaceStateRestorePreview, StateAuthorityRecord } from '../core/types.ts'

export interface BackupPreviewResult {
  preview: AiSpaceStateRestorePreview
  warningCount: number
  sourceVersion: string
  createdAt: string
  migrationPlan: AiSpaceStateMigrationPlan
}

interface BackupPageProps {
  onGetAuthority: () => StateAuthorityRecord | null
  onExport: () => string
  onPreview: (text: string) => BackupPreviewResult
  onSafeMigrate: (text: string) => void
  onRestore: (text: string) => void
}

function downloadBundle(text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ai-space-state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function BackupPage({ onGetAuthority, onExport, onPreview, onSafeMigrate, onRestore }: BackupPageProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<BackupPreviewResult | null>(null)
  const [authority, setAuthority] = useState<StateAuthorityRecord | null>(() => onGetAuthority())
  const [error, setError] = useState<string | null>(null)

  function generate(): void {
    try {
      const value = onExport()
      setText(value)
      setAuthority(onGetAuthority())
      setPreview(null)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function validate(): void {
    try {
      setPreview(onPreview(text))
      setAuthority(onGetAuthority())
      setError(null)
    } catch (caught) {
      setPreview(null)
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function safeMigrate(): void {
    try {
      onSafeMigrate(text)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function restore(): void {
    try {
      onRestore(text)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <section className="backup-page">
      <div className="hero backup-hero">
        <div>
          <p className="eyebrow">Persistence portability + state authority</p>
          <h1>Backup / Migration</h1>
          <p>Checkpoint AI Space-owned state into an authoritative lineage, classify incoming bundles before migration, and keep destructive replace restore explicit.</p>
        </div>
        <div className="backup-boundary card">
          <strong>Boundary</strong>
          <p>Lineage/revision metadata governs state ancestry, not user identity. FNV-1a remains accidental-corruption detection only, not a cryptographic trust signature.</p>
          <p>Safe migration only accepts provable bootstrap or direct fast-forward transitions. No last-write-wins or automatic merge is used.</p>
        </div>
      </div>

      <div className="backup-authority card">
        <div>
          <p className="eyebrow">Local authority</p>
          <h2>{authority ? `Revision ${authority.revision}` : 'Untracked'}</h2>
        </div>
        {authority ? (
          <dl>
            <div><dt>Lineage</dt><dd>{authority.lineageId}</dd></div>
            <div><dt>Head</dt><dd>{authority.headChecksum}</dd></div>
            <div><dt>State fingerprint</dt><dd>{authority.stateFingerprint}</dd></div>
            <div><dt>Updated</dt><dd>{authority.updatedAt}</dd></div>
          </dl>
        ) : <p>No authoritative checkpoint has been created on this installation yet.</p>}
      </div>

      <div className="backup-actions card">
        <div className="action-row">
          <button onClick={generate}>Generate authoritative bundle</button>
          <button className="secondary" disabled={!text.trim()} onClick={() => downloadBundle(text)}>Download JSON</button>
          <button className="secondary" disabled={!text.trim()} onClick={validate}>Validate / Plan</button>
        </div>
        <label>
          <span>State bundle JSON</span>
          <textarea value={text} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => { setText(event.target.value); setPreview(null); setError(null) }} rows={18} spellCheck={false} placeholder="Generate an authoritative bundle here, or paste an AI Space state bundle to validate and plan." />
        </label>
        {error ? <div className="error-banner">{error}</div> : null}
      </div>

      {preview ? (
        <div className="backup-preview card">
          <div>
            <p className="eyebrow">Staged audit passed</p>
            <h2>Migration / restore preview</h2>
            <p>Source {preview.sourceVersion} · {preview.createdAt}</p>
          </div>
          <div className="backup-migration-plan">
            <strong>Relation: {preview.migrationPlan.relation}</strong>
            <p>{preview.migrationPlan.reason}</p>
            <p>{preview.migrationPlan.safeToApply ? 'Safe migration is allowed.' : 'Safe migration is not allowed for this relation.'}</p>
          </div>
          <div className="backup-metrics">
            <div><strong>{preview.preview.created}</strong><span>created</span></div>
            <div><strong>{preview.preview.changed}</strong><span>changed</span></div>
            <div><strong>{preview.preview.cleared}</strong><span>cleared</span></div>
            <div><strong>{preview.preview.unchanged}</strong><span>unchanged</span></div>
            <div><strong>{preview.warningCount}</strong><span>audit warnings</span></div>
          </div>
          {preview.migrationPlan.safeToApply ? (
            <div className="backup-safe-migration">
              <strong>Authority-safe migration</strong>
              <p>The migration plan is recomputed immediately before write. The candidate must still be a safe bootstrap or direct fast-forward.</p>
              <button onClick={safeMigrate}>Apply safe migration & reload</button>
            </div>
          ) : null}
          <div className="backup-restore-warning">
            <strong>Explicit replace escape hatch</strong>
            <p>This ignores migration ancestry and replaces/clears the fixed AI Space domain-state allowlist after staged audit. Authoritative v1.1/v1.2 bundles adopt the candidate lineage; legacy v1.0 clears local authority. Use only when replacement is intentional.</p>
            <button className="danger-lite" onClick={restore}>Force replace AI Space state & reload</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
