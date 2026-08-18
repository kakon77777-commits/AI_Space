# AI Space Snapshots

GitHub stores immutable handoff archives. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | SHA-256 | Verification |
|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1.zip`](snapshots/AI_Space_v0.0.1.zip) | `ac4785b022fa9b1688dc4493524f37cb9c5d1f8b34d01ffeff3f4ea5df4c6921` | 9/9 dependency-free core tests; offline TypeScript check; internal 53-file checksum manifest; ZIP integrity pass. Vite production build was not run in the build container because npm registry DNS was unavailable. |

## Handoff rule

For any future AI or developer:

1. Download the latest ZIP.
2. Verify its SHA-256.
3. Read `README.md`, `HANDOFF.md`, and `SNAPSHOT.json` inside the archive.
4. Develop in a clean local/workspace copy.
5. Run the full networked dependency install/build before deployment.
6. Publish a new versioned ZIP rather than overwriting this snapshot.
