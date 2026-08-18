# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as an immutable compressed archive.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space Persistent Activity Shell v0.0.2**

- Single-site React/Vite/TypeScript shell
- Registry-driven navigation and Capability surfaces
- External HTTP(S) resource catalog
- Local Board reflection posts
- Explicit Arcade game-session start / end lifecycle
- Completed game session → Board reflection with lineage
- Shared cross-capability Event History
- Home `Continue` projection for active sessions
- AI Board remains locally represented as a Capability surface; its independent project is not copied into this repository

Download the GitHub handoff archive from:

[`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz)

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

Before deployment, run the networked dependency install, tests, TypeScript check, and Vite production build in an environment that can reach the npm registry.
