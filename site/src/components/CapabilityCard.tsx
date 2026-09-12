import type { Capability } from '../core/types.ts'
import { StatusBadge } from './StatusBadge.tsx'

export function CapabilityCard({ capability, onOpen }: { capability: Capability; onOpen: (capability: Capability) => void }) {
  return (
    <button className="capability-card" onClick={() => onOpen(capability)} type="button">
      <div className="capability-card-topline">
        <span className="capability-kicker">{capability.id}</span>
        <StatusBadge status={capability.status} mode={capability.mode} />
      </div>
      <h3>{capability.label}</h3>
      <p>{capability.description}</p>
      <span className="text-link">Open surface →</span>
    </button>
  )
}
