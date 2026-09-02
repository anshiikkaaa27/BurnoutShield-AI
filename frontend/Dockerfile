# ════════════════════════════════════════════════════════════════
#  BurnoutShield Frontend — Dockerfile
#  Build context: frontend/  (set in docker-compose)
# ════════════════════════════════════════════════════════════════

# ── Stage 1: build React app ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached layer — only re-runs when package.json changes)
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Pass API URL at build time.
# Docker:    leave empty → axios uses /api  → nginx proxies to backend
# Local dev: set to http://localhost:8000   → axios calls directly
ARG  REACT_APP_API_URL=""
ENV  REACT_APP_API_URL=$REACT_APP_API_URL

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────
FROM nginx:1.25-alpine

# Remove nginx default page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled React app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our nginx config (SPA routing + /api proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
