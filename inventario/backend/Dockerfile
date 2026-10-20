# syntax=docker/dockerfile:1
# Node 24: NestJS 12 se distribuye como ESM y Jest solo soporta require(esm) desde Node 24.9

# ---------- 1. Dependencias: capa cacheada mientras no cambie el lockfile ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build + pruebas unitarias como quality gate ----------
FROM deps AS build
COPY . .
RUN npm run build \
 && npm test \
 && npm prune --omit=dev

# ---------- 3. Runtime: solo lo necesario para ejecutar, usuario sin privilegios ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000

# 1) migraciones  2) seed idempotente  3) API
# `exec` reemplaza al shell: Node recibe SIGTERM directamente (cierre ordenado)
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && node dist/database/seeds/seed.js && exec node dist/main.js"]
