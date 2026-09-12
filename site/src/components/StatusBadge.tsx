import type { CapabilityMode, CapabilityStatus } from '../core/types.ts'

export function StatusBadge({ status, mode }: { status: CapabilityStatus; mode?: CapabilityMode }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {mode ? `${mode} · ${status}` : status}
    </span>
  )
}
