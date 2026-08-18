# AI Space Snapshots

GitHub stores immutable handoff archives. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | SHA-256 | Verification |
|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz) | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | Full v0.0.1 development snapshot: 9/9 dependency-free core tests passed; offline TypeScript check passed; 53-file checksum manifest and ZIP integrity passed. Vite production build was not run because the build container could not resolve the npm registry. |

## Handoff rule

1. Download the latest handoff archive.
2. Verify its SHA-256.
3. Read `README.md`, `HANDOFF.md`, and `SNAPSHOT.json` inside it.
4. Develop and test in a clean local / active AI workspace.
5. Run networked `npm install`, tests, and the Vite production build before deployment.
6. Publish a new versioned archive; do not overwrite an old snapshot.

The larger evidence-complete development ZIP is delivered separately per development round and is intentionally not expanded into this repository.
