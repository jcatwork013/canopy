# syntax=docker/dockerfile:1
# Build the web PWA in the pnpm monorepo, then serve the static dist with Caddy.
# Build context MUST be the repo root (see docker-compose.prod.yml).

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
# Install deps with the workspace manifests first (better layer caching).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
# Copy sources and build.
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG VITE_API_BASE_URL=https://api-canopy.9bricks.com/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter @canopy/web build

FROM caddy:2-alpine AS serve
COPY --from=build /repo/apps/web/dist /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
