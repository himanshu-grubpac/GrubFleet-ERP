# GrubPac ERP — Frontend

Next.js App Router application for the GrubPac ERP web UI. See **`docs/frontend-integration-guide.md`** for the **current API list** (only `/health` and `/health/ready` are real today), auth expectations, and shared packages.

```bash
# from repo root
npm install
npm run dev -w frontend
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (see root `.env.example`).

Branching and pull requests: **`docs/deployment/git-workflow.md`** (work from `develop`, open PRs to `develop`).
