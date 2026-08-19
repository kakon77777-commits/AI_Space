# AI Space

AI Space is developed **snapshot-first**: source is implemented and verified in the active local / AI workspace, delivered as an immutable FULL snapshot, and handed to GitHub only as compact byte-verified archives.

GitHub is intentionally a **control and handoff plane**, not the place where automated agents expand and edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.9 — Shared Space Context**

v0.0.9 promotes `spaceId` from a free-form lineage string into an authoritative persistent Mother Runtime object:

- persistent `SpaceStore` with `active | archived` lifecycle
- `private | shared` local visibility semantics
- stable built-in Spaces: `research`, `arcade`, `board`, `library`
- owner/member governance for registered local root Principals
- one active Space presence per Principal
- Projection presence derived from Root membership + Projection binding
- archiving a Space clears its active presences
- removing a member clears that member's stale presence
- `SpaceResourceRef` points to canonical `ResourceStore` objects instead of copying resources
- Space history is a filtered projection of the global Activity Event Store rather than a second event database
- `/spaces` is a first-class native management surface
- Projection creation can only target eligible active Spaces where the Root is a member
- Projection Enter / Return / Suspend / Archive synchronizes Space presence
- tracked Browser Session and managed child invocation require real Projection Space presence
- the Shell shows the active Space context

Core relation:

```text
Root Principal membership
→ Space
→ active Principal / Projection presence
→ Capability / Resource interaction
→ global ActivityEvent with spaceId
→ Space-local history projection
```

## Boundary statement

`shared` in v0.0.9 means shared among registered **local** root Principals in this browser-local runtime. It does **not** mean public, federated, remotely synchronized, cryptographically authenticated, or realtime multi-user.

Space is not a second truth store:

```text
Space resource = SpaceResourceRef → canonical ResourceStore object
Space history  = filter(global ActivityEvent Store, spaceId)
```

## GitHub snapshot reconstruction

Reconstruct through v0.0.8 using the version-ordered chain documented in [`SNAPSHOTS.md`](SNAPSHOTS.md). Then apply all six canonical v0.0.9 deltas below.

Every delta archive contains one wrapper directory, so extract with `--strip-components=1` into the project root:

```bash
tar -xJf snapshots/AI_Space_v0.0.9_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.9_AppLogicDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.9_RegistryDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.9_SpacesPageDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.9_ProjectionShellDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.9_StyleDelta.tar.xz --strip-components=1 -C <project-root>
```

That six-delta overlay was fresh-reconstructed from the delivered v0.0.8 FULL snapshot and compared against the v0.0.9 runnable `app/`; result: `diff=0`.

The evidence-complete **v0.0.9 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

## Deployment verification

On a normal networked machine:

```bash
cd app
npm install
npm test
npm run typecheck
npm run build
curl -fsS https://aiboard.evemisslab.com/api/schema
```

The build container for this snapshot still could not resolve the public AI Board hostname and `npm install` hit the explicit network timeout. Production reachability and the Vite production build are therefore **not claimed as verified in that container**.
