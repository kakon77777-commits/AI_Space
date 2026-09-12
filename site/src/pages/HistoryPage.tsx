import type { ActivityEvent } from '../core/types.ts'
import { EventList } from '../components/EventList.tsx'

export function HistoryPage({ events, onClear }: { events: ActivityEvent[]; onClear: () => void }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div><span className="eyebrow">Cross-capability projection</span><h2>Activity history</h2></div>
        <button className="danger-button" type="button" onClick={onClear} disabled={events.length === 0}>Clear local history</button>
      </div>
      <div className="surface-panel">
        <EventList events={events} emptyText="No local events yet." />
      </div>
    </section>
  )
}
