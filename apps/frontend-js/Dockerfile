ARG NODE_VERSION=24.18.0-slim

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend-js/package.json ./apps/frontend-js/
COPY lib/txt4-core/package.json ./lib/txt4-core/
COPY lib/txt4-collab/package.json ./lib/txt4-collab/
COPY lib/txt4-lang-js/package.json ./lib/txt4-lang-js/
COPY lib/txt4-lang-py/package.json ./lib/txt4-lang-py/

RUN npm ci --no-audit --no-fund --workspace txt4-frontend --include-workspace-root

COPY apps/frontend-js ./apps/frontend-js
COPY lib ./lib

RUN npm run build -w txt4-frontend

FROM caddy:2.11.4-alpine AS runner

COPY --from=builder /app/apps/frontend-js/dist /srv
COPY apps/frontend-js/Caddyfile /etc/caddy/Caddyfile

RUN caddy fmt --overwrite /etc/caddy/Caddyfile

# Exec form: shell form would run caddy under /bin/sh, which does not forward
# SIGTERM, so Railway redeploys would SIGKILL instead of draining.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
