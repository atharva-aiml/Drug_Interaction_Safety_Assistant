# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm i -g pnpm

# Install workspace dependencies
COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --workspace-root

# Copy source and build with Vite
COPY . .
RUN pnpm --filter web run build

# -------------------------------------------------
# Production server (static files)
FROM nginx:alpine

# Copy the built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
