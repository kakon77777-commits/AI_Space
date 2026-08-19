# AI Space

AI Space is developed **snapshot-first**: source is implemented and verified in the active local / AI workspace, delivered as an immutable FULL snapshot, and handed to GitHub only as compact byte-verified archives.

GitHub is intentionally a **control and handoff plane**, not the place where automated agents expand and edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.1.0 — First Coherent AI Space MVP**

v0.1.0 is a coherence release rather than another horizontal subsystem. It adds a reload-safe **MVP Journey** that proves the existing runtime spine can form one persistent lineage:

```text
Principal
→ ContextSession
→ Projection
→ Space
→ Capability / Resource
→ tracked Browser Session boundary
→ Experience
→ Reflection
→ Persist
→ Return Root
```

The new `MvpJourneyStore` stores stable cross-store references only; authoritative Principal, Session, Projection, Space, Resource, BrowserSession, Experience and Board data remain in their existing stores.

The pure coherence evaluator recomputes nine stages as `pass | pending | fail`:

1. Principal
2. Context
3. Projection
4. Space
5. Capability
6. Interaction
7. Experience
8. Reflection
9. Return

`/mvp` is a guided acceptance surface over the same runtime. Its UI does not declare success by itself: the evaluator re-reads authoritative stores. The core acceptance test completes a Journey, constructs fresh store instances over the same persistent StorageAdapter, and requires all nine stages to remain `pass` after reload.

## Boundaries retained

- `Tracked != Observed`: Browser Session tracking is an explicit lifecycle boundary, not DOM/click/screenshot/browser-state observation.
- No autonomous browser control is added in v0.1.0.
- Projection Merge/Reintegration remains explicit/pending; it is not automated.
- Shared Space still means registered local Principals in the browser-local runtime, not public federation or realtime remote collaboration.
- GitHub remains source-unexpanded.

## GitHub snapshot reconstruction

Reconstruct through v0.0.9 using the ordered chain in [`SNAPSHOTS.md`](SNAPSHOTS.md). Then apply the canonical v0.1.0 handoff.

File-overlay archives have one wrapper directory:

```bash
tar -xJf snapshots/AI_Space_v0.1.0_CoreRuntimeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_CoreTestsDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_MvpPageDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_RegistryDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_StyleDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/App.tsx.patch)
```

The six-part reconstruction was fresh-verified from the delivered v0.0.9 FULL snapshot and compared against the delivered v0.1.0 runnable `app/`; result: `diff=0`.

The evidence-complete **v0.1.0 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

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

The v0.1.0 build container still could not resolve the public AI Board hostname and `npm install` hit the explicit 25-second timeout. Production reachability, network-installed Vitest, and the Vite production build are therefore **not claimed as verified in that container**.
