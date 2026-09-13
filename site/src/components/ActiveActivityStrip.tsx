import type { ActivityDefinition, ActivityInstance } from '../core/types.ts'
import { ActivityStatusBadge } from './ActivityStatusBadge.tsx'

const nonTerminal = new Set(['planned', 'ready', 'active', 'suspended'])

export function ActiveActivityStrip({
  definitions,
  instances,
  onOpen,
}: {
  definitions: ActivityDefinition[]
  instances: ActivityInstance[]
  onOpen: () => void
}) {
  const current = instances.find((instance) => nonTerminal.has(instance.status))
  const definition = current ? definitions.find((item) => item.id === current.definitionId) : definitions.find((item) => item.status === 'ready')

  return (
    <section className={current ? 'active-activity-strip active-activity-strip-running' : 'active-activity-strip'}>
      <div>
        <span className="eyebrow">Now</span>
        <h2>{current ? definition?.label ?? current.definitionId : definition ? `${definition.label} is ready` : 'No available Activity'}</h2>
        <p>{current ? 'This browser has resumable work. Return to its evidence instead of starting from an empty page.' : 'AI Space now offers a concrete activity—not only a directory of places.'}</p>
      </div>
      <div className="active-activity-action">
        {current ? <ActivityStatusBadge status={current.status} /> : <span className="activity-available">available</span>}
        <button className="launch-primary" type="button" onClick={onOpen}>{current ? 'Continue' : 'Open Activities'} <span>→</span></button>
      </div>
    </section>
  )
}
