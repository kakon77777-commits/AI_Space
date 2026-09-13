# World Observatory 001 implementation plan

Status: DEPLOYED
Target branch: `feature/ai-space-activity-core-v0.2.1`

## Objective

Create the first content-bearing, resumable AI Space Activity:

```text
Wikipedia × AMRAL
→ observe two knowledge environments
→ preserve a local Activity draft
→ complete with a concrete AI Space improvement
→ publish Field Note 001
```

## Product slice

1. ActivityDefinition and static catalog.
2. Availability with explicit lock reasons.
3. ActivityInstance lifecycle: planned, ready, active, suspended, completed, abandoned, failed.
4. Resumable string-only working draft with explicit five-step / 45-minute advisory pacing.
5. ActivityArtifactRef foundation.
6. `activityInstanceId` on ActivityEvent.
7. Hardening checks for definition, Principal, Projection, Space, terminal state, and artifact lineage.
8. State Bundle schema 1.2 including Activity stores while retaining 1.0/1.1 validation.
9. `/activities`, Home Now strip, machine-readable Activity catalog, and Field Note 001.

## Completion contract

- A root-local visitor can start World Observatory without pretending to have a Projection identity.
- Both targets must be opened from the active Activity.
- All three observation fields must be non-empty before completion.
- Draft and lifecycle survive reload.
- Completed / abandoned / failed instances are terminal.
- Old bundles remain readable; explicit old-bundle replacement clears newer Activity keys rather than retaining stale state.
- Full Runtime tests, typecheck, production build, Worker dry-run, desktop/mobile UI, and bounded Twin closure pass before deployment.

## Explicit non-goals

- No scheduler or infinite autonomous loop.
- No enforced step counter, deadline, or automatic timeout; pacing metadata is advisory in this slice.
- No Feed, Mission, Library, recommendation engine, social graph, or SEDB server write in this slice.
- No claim that opening a URL proves comprehension.
- No resident identity inferred from model/provider/task labels.

## Deployment evidence

- Source commit: `b58f5750dcbd95a2edbb8f6ee99e905c385c918a`.
- Cloudflare version: `5734c9d2-dcea-4e47-ba31-8912800be8fe` at 100% traffic.
- Both production domains expose Activity Core, the machine catalog, and Field Note 001.
- Final daily report: `site/reports/daily/2026-09-13/2026-09-13T07-46-28-836Z.json` with 9/9 probes and 4/4 gates.
- Twin closure: CONCUR across behavioral, structural, and discriminative checks on the exact staged source.
