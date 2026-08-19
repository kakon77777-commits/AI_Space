# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots or verified deltas.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.4 — First Live Child Capability**

v0.0.4 connects the existing independent `kakon77777-commits/ai-board` project as the first real API child provider without copying that project's source into AI Space.

- generic API action bindings now support typed GET query / POST JSON dispatch
- provider health probing is part of the runtime contract
- AI Board manifest targets the public `https://aiboard.evemisslab.com` runtime
- Remote AI Board can load public messages and submit append-only posts through `/api/messages`
- Local Board remains a separate local reflection store; remote AI Board is a different append-only ledger
- AI Space writes remote history events only after the remote operation reports success
- failed refresh after a confirmed remote append does not misreport the append itself as failed
- no OAuth, privileged child credentials, browser automation, or Agent Projection is added in this release

Core flow:

```text
AI Space action
→ child capability manifest
→ deterministic dispatch plan
→ HTTP provider
→ confirmed result
→ AI Space event history
```

The AI Board repository already documents and implements the public REST contract used here. The build container for this snapshot could not resolve the public domain during the live probe, so **production reachability was not verified from this container**; the integration is contract-tested and must be re-probed in a normal networked environment before deployment.

## GitHub snapshot reconstruction

GitHub keeps compact, byte-verified reconstruction artifacts rather than an expanded source tree.

To reconstruct v0.0.4 from GitHub:

1. Download and extract [`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz).
2. Overlay [`snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz) to obtain the v0.0.3 runtime source.
3. Overlay both v0.0.4 artifacts:
   - [`snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz`](snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz)
   - [`snapshots/AI_Space_v0.0.4_UIDelta.tar.xz`](snapshots/AI_Space_v0.0.4_UIDelta.tar.xz)
4. Run networked dependency installation, tests, typecheck, live AI Board probe, and the Vite production build before deployment.

The **complete evidence-bearing v0.0.4 ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

Snapshot checksums and verification notes are recorded in [`SNAPSHOTS.md`](SNAPSHOTS.md).

## Development workflow

```text
Download latest reconstructible snapshot
→ verify checksums
→ develop/test locally or in the active AI workspace
→ produce a new immutable FULL snapshot
→ publish compact byte-verified GitHub handoff/delta artifacts
→ update GitHub snapshot index
```
