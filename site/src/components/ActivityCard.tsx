import type { ActivityAvailability, ActivityDefinition, ActivityInstance } from '../core/types.ts'
import { ActivityStatusBadge } from './ActivityStatusBadge.tsx'

export function ActivityCard({
  definition,
  availability,
  instance,
  onStart,
}: {
  definition: ActivityDefinition
  availability: ActivityAvailability
  instance?: ActivityInstance
  onStart: (definitionId: string) => void
}) {
  return (
    <article className="activity-card">
      <div className="activity-card-topline">
        <span className="eyebrow">{definition.domain} · {definition.executionMode}</span>
        {instance ? <ActivityStatusBadge status={instance.status} /> : <span className={availability.available ? 'activity-available' : 'activity-locked'}>{availability.available ? 'available' : 'locked'}</span>}
      </div>
      <h3>{definition.label}</h3>
      <p>{definition.description}</p>
      <div className="activity-contract">
        <span>{definition.pacing.suggestedSteps} suggested steps</span>
        {definition.pacing.suggestedDurationMinutes ? <span>about {definition.pacing.suggestedDurationMinutes} min</span> : null}
        <span>{definition.feedEmission}</span>
      </div>
      {!availability.available ? <ul className="activity-lock-reasons">{availability.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
      {!instance && availability.available ? <button className="launch-primary" type="button" onClick={() => onStart(definition.id)}>Start Activity <span>→</span></button> : null}
    </article>
  )
}
