# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.6 — Agent Identity + Session Context**

v0.0.6 gives the Mother Runtime a first-class answer to **who acted, in which AI Space context, through which capability**:

- persistent `PrincipalStore` for `human | agent | service`
- backward-compatible seeded principal `agent:local-demo`
- persistent active-principal selection
- `ContextSessionStore` with at most one active context session per Principal
- `/agents` as a first-class native management surface
- `ActivityEvent.contextSessionId` added without changing existing domain `sessionId` semantics
- Board posts and Arcade game sessions capture Principal + context-session lineage
- switching Principal does not expose or close another Principal's active game session
- App activity creation is centralized through a context-aware event helper
- Capability Runtime Manager from v0.0.5 remains the operational child control plane

The important invariant is:

```text
Principal
+ Context Session
+ Capability
+ Action
+ Resource / Domain Session
+ Result
→ Activity History
```

`contextSessionId` is the AI Space-wide activity context. Existing `sessionId` remains reserved for domain sessions such as an Arcade game session; v0.0.6 deliberately does not collapse those identities.

## GitHub snapshot reconstruction

The latest reconstructible GitHub chain is:

1. [`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz)
2. overlay [`snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz)
3. overlay both v0.0.4 deltas:
   - [`snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz`](snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz)
   - [`snapshots/AI_Space_v0.0.4_UIDelta.tar.xz`](snapshots/AI_Space_v0.0.4_UIDelta.tar.xz)
4. overlay both v0.0.5 deltas:
   - [`snapshots/AI_Space_v0.0.5_CoreDelta.tar.xz`](snapshots/AI_Space_v0.0.5_CoreDelta.tar.xz)
   - [`snapshots/AI_Space_v0.0.5_UIDelta.tar.xz`](snapshots/AI_Space_v0.0.5_UIDelta.tar.xz)
5. overlay all three v0.0.6 deltas:
   - [`snapshots/AI_Space_v0.0.6_CoreDelta.tar.xz`](snapshots/AI_Space_v0.0.6_CoreDelta.tar.xz)
   - [`snapshots/AI_Space_v0.0.6_AppDelta.tar.xz`](snapshots/AI_Space_v0.0.6_AppDelta.tar.xz)
   - [`snapshots/AI_Space_v0.0.6_SurfaceDelta.tar.xz`](snapshots/AI_Space_v0.0.6_SurfaceDelta.tar.xz)
6. run networked `npm install`, tests, typecheck, and the Vite production build before deployment.

The complete evidence-bearing **v0.0.6 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

The build container still could not resolve the public AI Board hostname during the live probe, and `npm install` timed out under the explicit network timeout. Therefore production reachability and the Vite production build are **not claimed as verified in that container**.

Snapshot checksums and verification notes are recorded in [`SNAPSHOTS.md`](SNAPSHOTS.md).

## Development workflow

```text
Download latest reconstructible snapshot
→ verify checksums
→ reconstruct locally
→ develop/test in the active AI workspace
→ produce a new immutable FULL snapshot
→ publish compact byte-verified GitHub deltas
→ update the snapshot index
```
