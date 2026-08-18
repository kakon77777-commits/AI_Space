# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.3 — Capability Adapter Contract**

v0.0.3 makes the Mother/Child Capability architecture executable:

- `CapabilityManifest` v0.1
- manifest validation before registration
- `Link / API / Native` integration modes
- deterministic dispatch-plan generation
- duplicate capability ID and route-collision protection
- provider lifecycle / health metadata
- AI Board shipped as a **declared child capability manifest only**; no live API connection is claimed
- existing local Board / Arcade / Shared History remain functional

Core flow:

```text
Child project
→ capability manifest
→ validate
→ provider
→ registry
→ dispatch plan
→ AI Space
```

## GitHub snapshot reconstruction

The verified GitHub artifact for v0.0.3 is a **code delta over v0.0.2**.

To reconstruct v0.0.3 from GitHub:

1. Download [`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz).
2. Extract it as the v0.0.2 base.
3. Download [`snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz).
4. Overlay the delta files onto the v0.0.2 base.
5. Run the networked dependency install, tests, typecheck, and Vite build before deployment.

The **complete evidence-bearing v0.0.3 ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

Snapshot checksums and verification notes are recorded in [`SNAPSHOTS.md`](SNAPSHOTS.md).

## Development workflow

```text
Download latest reconstructible snapshot
→ verify checksums
→ develop/test locally or in the active AI workspace
→ produce a new immutable FULL snapshot
→ publish a compact verified GitHub handoff/delta
→ update GitHub snapshot index
```
