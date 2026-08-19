# AI Space

AI Space is developed **snapshot-first**: source is developed and verified in a local / active AI workspace, then handed off to GitHub as immutable compressed snapshots.

GitHub is intentionally used as a **control and handoff plane**, not as the place where automated agents edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.0.8 — AI Arcade + Browser Session Boundary**

v0.0.8 turns Arcade external launches into explicit, Projection-scoped interaction boundaries without pretending AI Space can observe or automate the external browser:

- `BrowserSessionStore` tracks Projection-scoped external sessions
- tracked browser sessions require an active Projection and `arcade:START_BROWSER_SESSION`
- launch plans validate HTTP(S) targets and use `_blank` + `noopener,noreferrer`
- external content is marked `untrusted-external`
- `noopener,noreferrer` is recorded exactly; it is **not** described as a browser sandbox
- popup-blocked launches become abandoned sessions instead of fake successes
- completing a session records one `ExperienceRecord` and one pending `ExperienceReflectionCandidate`
- abandoning a session creates no Experience record
- Experience reflection may be explicitly promoted to the local Board
- legacy untracked external opens and legacy Arcade `GameSession` flows remain available
- `Tracked != Observed`: v0.0.8 records explicit lifecycle/results only; it does not claim DOM, click, or browser-state observation
- browser automation is deliberately **not implemented** in v0.0.8

Core relation:

```text
Active Projection
→ Arcade Resource
→ validated external launch plan
→ Browser Session boundary
→ Complete / Abandon
→ Experience Record
→ pending Reflection Candidate
→ optional local Board reflection
```

## GitHub snapshot reconstruction

The latest reconstructible GitHub chain starts from [`snapshots/AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz).

Apply every later delta in version order. Every delta archive has one wrapper directory, so extract with `--strip-components=1`. After applying the v0.0.7 chain, apply v0.0.8:

```bash
tar -xJf snapshots/AI_Space_v0.0.8_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_AppDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_SurfaceCodeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_StyleDelta.tar.xz --strip-components=1 -C <project-root>
```

The v0.0.8 four-delta overlay was fresh-reconstructed from v0.0.7 and compared against the delivered v0.0.8 runnable `app/`; result: `diff=0`.

Run networked `npm install`, tests, typecheck, a live AI Board probe, and the Vite production build before deployment.

The complete evidence-bearing **v0.0.8 FULL ZIP** is delivered separately in the development round. GitHub remains intentionally minimal.

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
