export function NotFoundPage({ onHome }: { onHome: () => void }) {
  return (
    <section className="surface-panel placeholder-panel">
      <span className="eyebrow">Unknown route</span>
      <h2>This surface is not registered.</h2>
      <p>AI Space resolves routes through the Capability Registry. Unknown routes do not become implicit capabilities.</p>
      <button className="primary-button" type="button" onClick={onHome}>Return Home</button>
    </section>
  )
}
