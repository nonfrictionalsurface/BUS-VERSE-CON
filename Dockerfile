# syntax=docker/dockerfile:1.7
FROM node:20-slim AS base
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter api exec prisma generate
RUN pnpm -r --if-present build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4310
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 4310
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:4310/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
USER node
WORKDIR /app/apps/api
CMD ["node", "dist/bootstrap.js"]