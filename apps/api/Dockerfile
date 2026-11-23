# API image for Cloud Run. Build from the REPO ROOT (the API depends on the
# workspace package @disa/shared-types):
#   docker build -f apps/api/Dockerfile -t disa-api .
#
# Runs TypeScript directly via tsx: @disa/shared-types ships raw .ts and the
# API imports runtime values from it (e.g. SEVERITIES), so a plain `tsc` emit
# run with `node` can't resolve it. tsx handles both.
#
# Debian slim (glibc), not alpine: bcrypt and pdfjs-dist's optional
# @napi-rs/canvas ship prebuilt glibc binaries.

FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Manifests first so the dependency layer is cached across source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --prod --filter api...

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app /app
COPY packages/shared-types/src packages/shared-types/src
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/

WORKDIR /app/apps/api
USER node
# Cloud Run sets PORT (default 8080); config.ts reads it.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/server.ts"]
