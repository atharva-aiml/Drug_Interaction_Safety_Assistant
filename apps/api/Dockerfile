# Use the official Node image (LTS)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm (fast package manager)
RUN npm i -g pnpm

# Copy only package metadata first (caches deps)
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api run build

# Build the TypeScript sources
RUN pnpm --filter api run build

# -------------------------------------------------
# Runtime image
FROM node:20-alpine

WORKDIR /app

# Copy only the compiled output and runtime deps
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules

# Expose the server port (the code listens on 3000)
EXPOSE 3000

# Run the compiled server
CMD ["node", "dist/server.js"]
