# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / conversation workspace, then handed off to GitHub as an immutable ZIP snapshot.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space Foundation Shell v0.0.1**

- Single-site React/Vite/TypeScript shell
- Capability Registry
- Home / Board / Arcade / Explore / History surfaces
- External HTTP(S) resource catalog
- Local cross-capability activity history
- AI Board reserved as a capability placeholder; its independent project is not copied into this repository

Download the current source snapshot from:

[`snapshots/AI_Space_v0.0.1.zip`](snapshots/AI_Space_v0.0.1.zip)

Snapshot index and SHA-256 are recorded in [`SNAPSHOTS.md`](SNAPSHOTS.md).

## Development workflow

```text
Download latest ZIP
→ verify checksum
→ develop/test locally or in the active AI workspace
→ create a new immutable ZIP
→ update GitHub snapshot index
```

For architecture, handoff notes, tests, and the public/technical AI Space papers, open the ZIP. The ZIP contents are canonical for that snapshot.
