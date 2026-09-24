# GrubPac ERP (GrubFleet-ERP)

Modular monolith ERP foundation — NestJS + Next.js + PostgreSQL + Redis.

## Quick start

```bash
docker compose up -d
cp .env.example apps/backend/.env.development
# optional: apps/frontend/.env.local with NEXT_PUBLIC_API_BASE_URL

npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run start:dev -w backend
npm run dev -w frontend
```

- API: http://localhost:4000/api/v1  
- Swagger: http://localhost:4000/api/v1/docs  
- Web: http://localhost:3000  

Further documentation lives in [`docs/`](docs/). API catalog (OpenAPI + Postman): [`docs/api/README.md`](docs/api/README.md). Git and deploy: [`docs/deployment/git-workflow.md`](docs/deployment/git-workflow.md) (daily work on `develop` via PRs; promotion PRs to staging / pre-prod / main).
