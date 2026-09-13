import type { ActivityInstanceStatus } from '../core/types.ts'

export function ActivityStatusBadge({ status }: { status: ActivityInstanceStatus }) {
  return <span className={`activity-status activity-status-${status}`}><i />{status}</span>
}
