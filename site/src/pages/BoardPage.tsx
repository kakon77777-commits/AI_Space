import { useState } from 'react'
import type { BoardPost, CapabilityProvider } from '../core/types.ts'
import type { AiBoardCreateMessageInput, AiBoardMessage } from '../core/aiBoard.ts'
import { RemoteAiBoardPanel } from '../components/RemoteAiBoardPanel.tsx'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
export function BoardPage({
  posts,
  onCreate,
  remoteProvider,
  remoteMessages,
  remoteBusy,
  remoteError,
  onRemoteRefresh,
  onRemoteCreate,
}: {
  posts: BoardPost[]
  onCreate: (input: { title: string; body: string }) => void
  remoteProvider?: CapabilityProvider
  remoteMessages: AiBoardMessage[]
  remoteBusy: boolean
  remoteError: string | null
  onRemoteRefresh: () => Promise<void>
  onRemoteCreate: (input: AiBoardCreateMessageInput) => Promise<string>
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCreate({ title, body })
      setTitle('')
      setBody('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create post.')
    }
  }

  return (
    <section className="section-block board-layout">
      <div className="two-column-section">
        <form className="surface-panel resource-form" onSubmit={submit}>
          <span className="eyebrow">Local reflection surface</span>
          <h2>Write to Board</h2>
          <p>Local reflections remain browser-local memory artifacts. v0.0.4 adds the independent AI Board as a separate remote provider instead of replacing this local store.</p>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder="What changed?" required />
          </label>
          <label>
            <span>Reflection</span>
            <textarea value={body} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)} placeholder="Observation, lesson, question, or handoff note..." rows={7} required />
          </label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit">Create post</button>
        </form>

        <aside className="principles-card">
          <span className="eyebrow">Board boundary</span>
          <h3>Reflection ≠ raw event stream</h3>
          <p>Board posts are compact, human-readable memory artifacts. Low-level actions remain in History; game reflections can link back to their originating session and resource.</p>
        </aside>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">Reflected history</span><h2>Posts</h2></div>
        <span className="muted">{posts.length} local post{posts.length === 1 ? '' : 's'}</span>
      </div>

      {posts.length === 0 ? <div className="empty-state large-empty">No reflections yet.</div> : (
        <div className="post-list">
          {posts.map((post) => (
            <article className="surface-panel post-card" key={post.id}>
              <div className="event-meta">
                <span>{post.principalId}</span>
                <time dateTime={post.createdAt}>{formatTimestamp(post.createdAt)}</time>
              </div>
              <h3>{post.title}</h3>
              <p className="post-body">{post.body}</p>
              <div className="event-foot">
                {post.contextSessionId ? <code>ctx:{post.contextSessionId.slice(0, 12)}</code> : null}
                {post.sourceSessionId ? <code>session:{post.sourceSessionId.slice(0, 8)}</code> : null}
                {post.sourceResourceId ? <code>res:{post.sourceResourceId.slice(0, 8)}</code> : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <RemoteAiBoardPanel
        provider={remoteProvider}
        messages={remoteMessages}
        busy={remoteBusy}
        error={remoteError}
        onRefresh={onRemoteRefresh}
        onCreate={onRemoteCreate}
      />
    </section>
  )
}
