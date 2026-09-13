import type { ActivityEvent } from '../core/types.ts'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function EventList({ events, emptyText = 'No activity yet.' }: { events: ActivityEvent[]; emptyText?: string }) {
  if (events.length === 0) return <div className="empty-state">{emptyText}</div>

  return (
    <div className="event-list">
      {events.map((event) => (
        <article className="event-item" key={event.id}>
          <div className="event-meta">
            <span>{event.action}</span>
            <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
          </div>
          <strong>{event.summary}</strong>
          <div className="event-foot">
            <code>{event.principalId}</code>
            {event.capabilityId ? <code>cap:{event.capabilityId}</code> : null}
            {event.resourceId ? <code>res:{event.resourceId.slice(0, 8)}</code> : null}
            {event.contextSessionId ? <code>ctx:{event.contextSessionId.slice(0, 12)}</code> : null}
            {event.sessionId ? <code>session:{event.sessionId.slice(0, 8)}</code> : null}
            {event.activityInstanceId ? <code>activity:{event.activityInstanceId.slice(0, 14)}</code> : null}
          </div>
        </article>
      ))}
    </div>
  )
}
