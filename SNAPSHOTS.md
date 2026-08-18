# AI Space Snapshots

GitHub stores immutable handoff archives. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | SHA-256 | Verification |
|---|---|---|---|---|
| v0.0.2 | 2026-08-18 | [`AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz) | `8c9d97b63112df193da39647494dadfe9a0b2987e44ea7403892d3c8ab11464f` | Full v0.0.2 development snapshot: 16/16 dependency-free core tests passed; offline TypeScript check passed; 67-file checksum manifest and FULL ZIP integrity passed. GitHub compact handoff was independently verified by matching its precomputed Git blob SHA-1 to GitHub's returned blob SHA. Networked npm dependency install / Vite build was not verified because registry access stalled until the build-tool timeout. |
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz) | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | Full v0.0.1 development snapshot: 9/9 dependency-free core tests passed; offline TypeScript check passed; 53-file checksum manifest and ZIP integrity passed. Vite production build was not run because the build container could not resolve the npm registry. |

## Handoff rule

1. Download the latest handoff archive.
2. Verify its SHA-256.
3. Read this repository README and snapshot index, then inspect the `app/` source and tests inside the archive.
4. Develop and test in a clean local / active AI workspace.
5. Run networked `npm install`, tests, TypeScript check, and the Vite production build before deployment.
6. Publish a new versioned archive; do not overwrite an old snapshot.

The larger evidence-complete development ZIP is delivered separately per development round and is intentionally not expanded into this repository.
