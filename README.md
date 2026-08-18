# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as an immutable compressed archive.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space Foundation Shell v0.0.1**

- Single-site React/Vite/TypeScript shell
- Capability Registry
- Home / Board / Arcade / Explore / History surfaces
- External HTTP(S) resource catalog
- Local cross-capability activity history
- AI Board reserved as a capability placeholder; its independent project is not copied into this repository

Download the GitHub handoff archive from:

[`snapshots/AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz)

Snapshot index and SHA-256 are recorded in [`SNAPSHOTS.md`](SNAPSHOTS.md).

## Development workflow

```text
Download latest handoff archive
→ verify checksum
→ develop/test locally or in the active AI workspace
→ produce a new immutable full snapshot + compact handoff archive
→ update GitHub snapshot index
```

The GitHub handoff archive contains the runnable source plus the minimum README/HANDOFF/SNAPSHOT metadata required for another AI or developer to continue. Full evidence bundles, reference papers, raw verification logs, and other large handoff evidence may be delivered separately with each development round rather than expanding the repository source tree.
