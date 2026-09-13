# Company GitHub separation and migration study v0.1

Recorded: 2026-09-13
Status: research candidate; no Organization created and no repository transferred

## Current observed account state

Authenticated owner: `kakon77777-commits`

| Measure | Observed |
|---|---:|
| Repositories | 122 |
| Public | 118 |
| Private | 4 |
| Archived | 2 |
| Forks | 16 |
| Organizations returned by GitHub API | 0 |

Company products, research programs, personal experiments, forks, and internal repositories currently share one personal namespace. This is a real ownership and discoverability problem even with one human operator.

## Organization is not the same as Enterprise Cloud

GitHub allows a free Organization with unlimited public and private repositories. Current public pricing lists Team at US$4 per user/month and Enterprise beginning at US$21 per user/month. Enterprise Cloud primarily adds an enterprise account for centralized management across organizations plus controls such as SAML, SCIM / managed users, compliance, and larger included usage.

Official references:

- [GitHub pricing](https://github.com/pricing)
- [About organizations](https://docs.github.com/en/enterprise-cloud@latest/organizations/collaborating-with-groups-in-organizations/about-organizations)
- [About GitHub Enterprise Cloud](https://docs.github.com/en/enterprise-cloud@latest/admin/overview/about-github-enterprise-cloud)
- [Included usage by plan](https://docs.github.com/en/billing/reference/product-usage-included)

## Recommendation for the present company stage

### Now: create one company Organization

Start with GitHub Free for the Organization unless a required private-repository rule is unavailable. Move to Team when private-repository rule enforcement, additional review controls, or its included usage has an actual near-term benefit.

### Defer Enterprise Cloud

Do not buy Enterprise Cloud merely to separate company ownership from a personal namespace. Re-evaluate when at least one trigger becomes real:

- multiple Organizations need central policy and billing;
- human staff require SAML / SCIM lifecycle management;
- Enterprise Managed Users are desired;
- a customer, regulator, insurer, or contract requires enterprise compliance controls;
- Team limits create measured operational cost.

Candidate names `EveMissLab`, `EveMissLabAI`, and `EveMissLab-Research` returned no public user/API record during this study. That is not a reservation or availability guarantee; the owner must choose the legal/product namespace before creation.

## Repository lanes

Every repository must receive one explicit classification before transfer:

1. `COMPANY_PRODUCT` — deployed products and their operational control planes.
2. `COMPANY_RESEARCH` — research programs intended to belong to the company corpus.
3. `COMPANY_INTERNAL` — private operations, credentials-free infrastructure, and internal tooling.
4. `PERSONAL` — genuinely personal work that should remain under the owner account.
5. `UPSTREAM_FORK` — forks retained for contribution or preservation.
6. `LEGACY_ARCHIVE` — frozen history with no active product authority.
7. `UNRESOLVED_OWNER` — no transfer until provenance and intended owner are settled.

Likely first-pass company candidates include AI Space, AI Space Board, AI Board, Trellis, Storyforge, AGIRight, EveMissLab-PMW-Fabric, SEDB, MMRF, UFA, and AMRAL repositories. This is a candidate list, not an adopted ownership decision.

## Migration waves

### Wave 0 — choose the boundary

- Choose Organization name and Free versus Team.
- Record legal/company display name, public profile, contact, and repository naming conventions.
- Require two-factor authentication and keep at least two recoverable Organization owner paths before additional humans join.

### Wave 1 — full census

- Export all repository metadata, visibility, default branch, forks, Pages, Actions, environments, secrets-by-name, webhooks, deploy keys, packages, releases, branch/rulesets, and external deployments.
- Map local worktrees and production domains to repository authority.
- Classify every repository into one lane above.

### Wave 2 — canary

- Transfer one low-risk public coordination repository with no production deployment. `AI_Space_Board` is a candidate because its issues and history matter while it does not serve the live site.
- Verify redirects, clone/fetch/push, issues, comments, branch rules, links, and local remotes before continuing.

### Wave 3 — public non-production repositories

- Move documentation, research, and preservation repositories with no active deployment integration.
- Repair badges, repository URLs, submodules, manifests, and source references.

### Wave 4 — deployed products

- Move one product at a time.
- Re-authorize owner-scoped GitHub Apps and verify Cloudflare, Pages, Actions, webhooks, environments, custom domains, and release flows.
- Treat redirect success as insufficient; require a fresh production readback bound to the transferred repository.

### Wave 5 — private and internal repositories

- Confirm plan feature parity before transfer.
- Rebind Organization / repository / environment secrets without printing values.
- Verify least privilege, recovery ownership, Actions budgets, and audit visibility.

### Wave 6 — closeout

- Re-run the global inventory and require zero unclassified active company repositories.
- Keep personal forks and personal work deliberately personal.
- Publish a machine-readable owner map and migration ledger.

## Per-repository acceptance

GitHub documents that issues, pull requests, wiki, stars, watchers, commit attribution, webhooks, services, secrets, and deploy keys remain associated during a repository transfer. Private repositories transferred to a lower-feature plan can lose protected-branch or Pages capabilities, so plan parity must be checked first.

Reference: [Transferring a repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/creating-and-managing-repositories/transferring-a-repository)

For each repository verify:

- old URL redirects and new URL resolves;
- clone, fetch, and authorized push;
- issues, pull requests, releases, tags, wiki, stars, and watchers;
- default branch, rulesets, environments, reviewers, and CODEOWNERS;
- Actions workflow permissions, OIDC subjects, variables, and secret names;
- Pages/custom domains, Cloudflare/Vercel/other GitHub Apps, webhooks, and deploy keys;
- packages, containers, submodules, badges, docs links, capability manifests, and API allowlists;
- local remotes and worktree documentation;
- one post-transfer build and, for deployed products, production readback.

Organization, repository, and environment secrets have different precedence. Their values must never be exported into the migration ledger. Reference: [GitHub Actions secrets](https://docs.github.com/en/actions/reference/security/secrets).

## Stop boundaries

- No bulk transfer.
- No Organization creation until the owner chooses the namespace and plan.
- No transfer of a deployed repository without an exact integration inventory and rollback plan.
- No assumption that an old URL redirect proves Actions, Apps, packages, or deployment authority survived.
- No Enterprise purchase until a real trigger justifies it.
