# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.7 — Projection Runtime**

v0.0.7 adds bounded Agent projections on top of the v0.0.6 Principal + ContextSession foundation:

- `ProjectionStore` creates a real `Principal(type=projection)` with explicit root lineage
- nested projections are rejected in v0.0.7
- Projection lifecycle: `active ↔ suspended → archived`, with archived terminal
- permission scope grammar: `capability:ACTION`, `capability:*`, `*:*`
- managed child-provider invocation enforces Projection permission scope **before transport I/O**
- memory scope is explicit inherited-scope metadata only; raw memory is not copied automatically
- Projection events preserve `projectionId`, `rootPrincipalId`, and `spaceId`
- `/projections` is a first-class native management surface
- Enter Projection / Return Root switches active Principal through the Projection lifecycle
- checkpoints and pending merge candidates are persisted
- automatic Merge/Reintegration is deliberately **not implemented** in v0.0.7
- ordinary `PrincipalStore.create()` cannot create orphan Projection principals; Projection Runtime is the only legal creation path

Core relation:

```text
Root Principal
→ bounded Projection Principal
→ Space
→ scoped child capability invocation
→ Event lineage
→ checkpoint / pending merge candidate
```

Projection is not Clone. A Projection keeps explicit lineage to one root Principal and carries bounded permissions/memory declarations for one target Space.

## GitHub snapshot reconstruction

The latest reconstructible GitHub chain is:

1. Download and extract [`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz) as the project root.
2. Apply every later delta in version order. Every delta archive has one wrapper directory, so extract with `--strip-components=1`:

```bash
tar -xJf snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.4_UIDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.5_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.5_UIDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.6_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.6_AppDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.6_SurfaceDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.7_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.7_AppDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.7_SurfaceCodeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.7_StyleDelta.tar.xz --strip-components=1 -C <project-root>
```

The v0.0.7 four-delta reconstruction above was fresh-verified against the complete v0.0.7 runnable `app/` tree with `diff=0`.

3. Run networked `npm install`, tests, typecheck, and the Vite production build before deployment.

The complete evidence-bearing **v0.0.7 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

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
