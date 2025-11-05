# Base stage.
FROM node:lts-alpine AS base

# Install pnpm.
RUN npm install --global pnpm@10.20.0

# Builder stage.
FROM base AS builder

WORKDIR /app

# Copy required files.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json source ./

# Fetch dependencies.
RUN pnpm fetch

# Install dependencies.
RUN pnpm install --offline

# Build the application.
RUN pnpm run build

# Production stage.
FROM base AS production

WORKDIR /app

# Copy required files.
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Fetch dependencies.
RUN pnpm fetch --prod

# Install dependencies.
RUN pnpm install --prod --offline

# Final stage.
FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app/distribution ./distribution
COPY --from=builder /app/package.json ./package.json
COPY --from=production /app/node_modules ./node_modules

# Start the application.
ENV NODE_ENV=production
CMD ["npm", "run-script", "start"]
