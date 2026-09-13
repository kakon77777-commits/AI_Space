# AI Space public site lane

## Authority and lineage

- Branch: `feature/ai-space-activity-core-v0.2.1`
- Working source: `site/`
- Runtime base: owner-provided `AI_Space_v0.1.3.zip`
- Base verification: bundled snapshot verifier passed all 138 manifest-listed files before the `site/` tree was copied.
- Archive/control-plane base: `AI_Space_repo` main at `cae2967`.

The historical snapshots remain immutable. This branch adds a live public-site lane without rewriting the archive or claiming that v0.3 research proposals are already implemented.

## Public topology

- Canonical: `https://aispaces.app/`
- Second entry: `https://eveaispace.com/`
- Cloudflare Worker: `evemisslab-ai-space`
- Public world manifest: `/manifests/ai-space-worlds.v1.json`
- Public Activity manifest: `/manifests/ai-space-activities.v1.json`
- Health: `/healthz`

Both domains serve the same application. `aispaces.app` is the canonical URL in page metadata. Child worlds remain independent services with separate authority boundaries.

## Current production

- Source commit: `b58f5750dcbd95a2edbb8f6ee99e905c385c918a`
- Worker version: `5734c9d2-dcea-4e47-ba31-8912800be8fe`
- Deployed: `2026-09-13T07:44:17.998Z`
- Traffic: 100% on the version above
- Candidate daily check: `site/reports/daily/2026-09-13/2026-09-13T07-46-28-836Z.json`
- Deployment receipt: `site/reports/deployments/2026-09-13-activity-core-v0.2.1.md`

Production now includes Activity Core, World Observatory 001, and Field Note 001. The default branch remains unchanged. Production was deployed from the reviewed feature-branch commit above; later evidence-only commits do not imply a new deployment.

## Local gates

From `site/`:

```powershell
npm test
npm run typecheck
npm run build
npm run deploy:dry-run
```

See `site/docs/DAILY_FLOW.md` for the deliberately unscheduled daily workflow.
