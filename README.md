# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.5 — Capability Runtime Manager**

v0.0.5 turns the passive capability registry into an operational control plane:

- persistent per-provider runtime state, separate from desired manifest state
- enable / disable gates that survive reloads
- health probes with last probe time, latency, health, and last error
- side-effect-free dispatch preview
- managed API invocation with success / failure observations
- `/capabilities` management surface
- shared provider lifecycle / invocation events
- AI Board traffic now delegates through the same runtime manager gate, so a disabled child cannot be bypassed from the Board page
- v0.0.4 AI Board REST adapter remains the first connected child provider

Core flow:

```text
Child manifest
→ register provider
→ restore runtime state
→ probe / enable / disable
→ preview
→ managed invoke
→ observed runtime state
→ shared event history
```

`manifest.lifecycle` remains desired/configuration state. `runtime.enabled` is the local operational gate. `runtime.health`, timestamps, latency, and errors are observed runtime state.

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
5. run networked `npm install`, tests, typecheck, and the Vite production build before deployment.

The complete evidence-bearing **v0.0.5 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

The build container could not resolve the public AI Board hostname during the live probe, and `npm install` timed out under the explicit network timeout. Therefore production reachability and the Vite production build are **not claimed as verified in that container**.

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
