# Blue-green deployment

Deploy workflows run after **PR merges** to environment branches (`staging`, `pre-prod`, `main`) — not after direct pushes for product work. See [git-workflow.md](./git-workflow.md).

Deploy workflows use a **minimum viable blue-green pattern** in GitHub Actions until AWS ECS/CodeDeploy (or similar) is connected. Images are published to **GitHub Container Registry (GHCR)**; deploy steps are structured so you can swap the simulated block for real infrastructure.

## Workflows

| Workflow | Trigger branch | GitHub Environment | Approval |
|----------|----------------|--------------------|----------|
| `deploy-staging.yml` | `staging` | `staging` | None |
| `deploy-preprod.yml` | `pre-prod` | `pre-production` | None (optional reviewers in UI) |
| `deploy-production.yml` | `main` | `production` | **Required reviewers** on `production` environment |

Shared logic: `.github/workflows/reusable-container-deploy.yml`  
Composite deploy steps: `.github/actions/blue-green-deploy/action.yml`

## Concurrency

Each environment uses a **concurrency group** (`deploy-staging`, `deploy-pre-production`, `deploy-production`) with `cancel-in-progress: false` so in-flight deploys are not interrupted.

## Pipeline stages

1. **Build and push** — Docker images:
   - `ghcr.io/<owner>/<repo>/backend:<branch-ref>-<sha>`
   - `ghcr.io/<owner>/<repo>/frontend:<branch-ref>-<sha>`
   - Floating tags: `staging-latest`, `preprod-latest`, `production-latest`
2. **Frontend artifact** — `npm run build -w frontend`; upload `.next` for future Amplify/S3 deploy (stub comments in workflow).
3. **Deploy inactive slot** — composite action targets slot **opposite** `ACTIVE_SLOT` (`blue` ↔ `green`).
4. **Smoke test** — `GET {DEPLOY_HEALTH_URL}/health` when `DEPLOY_HEALTH_URL` is set.
5. **Flip marker** — upload artifact `active-slot-<label>`; update Environment variable `ACTIVE_SLOT` to the new active slot.
6. **Drain** — scale down or stop tasks on the old slot (manual / future automation).
7. **Rollback** — on deploy failure, `rollback-on-failure` job logs instructions; wire to redeploy previous image tag or CodeDeploy rollback.

## Wiring AWS (later)

Replace the simulated step in `.github/actions/blue-green-deploy/action.yml` with:

- ECS: update service on inactive target group, wait for steady state, run smoke test, switch listener rule, drain old service.
- CodeDeploy: `appspec` + deployment group with blue/green configuration.

Use `DEPLOY_TARGET` secret to pass cluster/service or deployment group identifiers.

## Production gate

Configure the **`production`** GitHub Environment with **required reviewers** so the `deploy-blue-green` job waits for approval before smoke tests and traffic flip. Build jobs can complete before approval; only the deploy job should reference `environment: production`.

## Health checks

Smoke tests call **`/api/v1/health`** (liveness). For dependency validation before traffic switch, extend smoke to **`/api/v1/health/ready`** once databases are reachable from the runner or an internal canary URL.
