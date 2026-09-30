# Git workflow (PR-only)

All product changes reach shared and deployed branches **only through pull requests**. Do not push directly to `staging`, `pre-prod`, or `main`. Integrate daily work on **`develop`** via feature branches and PRs.

## Branches

| Branch | Who pushes | Purpose |
|--------|------------|---------|
| `develop` | Merge via PR only | Integration branch for backend and frontend |
| `staging` | Merge via PR only | Deploy staging (push after merge triggers GHA) |
| `pre-prod` | Merge via PR only | Deploy pre-production |
| `main` | Merge via PR only | Deploy production |
| `feature/*`, `fix/*`, `chore/*` | Developers | Short-lived work branches |

## Daily development (backend and frontend)

1. Sync `develop`: `git fetch origin` and `git checkout develop` / `git pull origin develop`.
2. Create a branch from **`develop`**: `feature/<short-description>` (or `fix/…`, `chore/…`).
3. Commit on the feature branch; open a **PR into `develop`**.
4. Wait for **CI** green on the PR; get review if your team requires it; merge the PR.
5. Delete the feature branch after merge (local and remote) when done.

Backend and frontend developers use the same pattern: always branch from `develop`, always merge back through a PR to `develop`.

## Environment promotion (when ready to release)

Do not skip tiers unless an approved hotfix process says otherwise.

```text
feature/fix/chore  →  PR  →  develop
develop            →  PR  →  staging      →  deploy-staging.yml
staging            →  PR  →  pre-prod     →  deploy-preprod.yml
pre-prod           →  PR  →  main         →  deploy-production.yml
```

After a promotion PR merges, GitHub Actions deploys the target environment (see [environments.md](./environments.md) and [blue-green.md](./blue-green.md)). Merges to `staging`, `pre-prod`, and `main` should be done by someone with permission to promote; still use PRs, not direct pushes.

## CI

Workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on:

- **Pull requests** targeting `develop`, `staging`, `pre-prod`, or `main`
- **Pushes** to those same long-lived branches (typically after a PR merge)

Opening a PR from `feature/…` into `develop` runs CI before merge.

## One-time repository setup (if only `main` exists)

Use this once per repo when GitHub has **`main`** but not yet **`develop`** (and optionally `staging`, `pre-prod`).

1. From an up-to-date `main`, create **`develop`** pointing at the same commit as `main`.
2. Push **`develop`** to `origin`.
3. In GitHub **Settings → Branches**, add branch protection (recommended):
   - **`main`**, **`pre-prod`**, **`staging`**: require pull request before merge; require status checks (CI); restrict who can push (no direct pushes for product work).
   - **`develop`**: require PR before merge and CI status checks; allow developers to merge feature PRs.
4. Set the repo **default branch** to **`develop`** only if the team wants new clones and the GitHub UI default base to be `develop`; otherwise keep **`main`** as default and still use **`develop`** as the daily integration base for feature PRs.
5. Create empty **`staging`** and **`pre-prod`** from `develop` or `main` when you are ready for those environments, then protect them the same way as `main`.

The agent does not configure GitHub via API; a maintainer applies these settings in the GitHub UI.

## Copy-friendly team instructions

```text
GrubFleet-ERP — Git workflow

Daily base branch: develop (backend + frontend)

Working branches:
  feature/<short-description>
  fix/<short-description>
  chore/<short-description>

Rules:
  - Never push product work directly to staging, pre-prod, or main.
  - Branch from develop, open PR to develop, merge when CI is green.
  - Promote only via PRs: develop → staging → pre-prod → main.

Typical day:
  git fetch origin
  git checkout develop
  git pull origin develop
  git checkout -b feature/my-change
  … commit …
  git push -u origin feature/my-change
  Open PR: feature/my-change → develop

When releasing:
  PR develop → staging   (merge triggers staging deploy)
  PR staging → pre-prod  (merge triggers pre-prod deploy)
  PR pre-prod → main     (merge triggers production deploy; approval gate)

Docs: docs/deployment/git-workflow.md
```

## Related docs

- [Deployment overview](./README.md)
- [Environments and promotion](./environments.md)
- [Blue-green deploy](./blue-green.md)
