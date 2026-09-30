# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

ENV HUSKY=0
ENV CI=true

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/validation/package.json ./packages/validation/
RUN npm ci --workspace=backend --include-workspace-root --ignore-scripts

COPY packages/validation ./packages/validation
COPY apps/backend ./apps/backend
RUN npm run build -w backend

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HUSKY=0
ENV CI=true

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/validation/package.json ./packages/validation/
RUN npm ci --workspace=backend --include-workspace-root --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

USER nestjs
WORKDIR /app/apps/backend
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
