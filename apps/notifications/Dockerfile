# Builder stage.
FROM node:lts-alpine AS builder

WORKDIR /notifications

# Install pnpm.
RUN npm install --global pnpm@10.20.0

# Copy the monorepo files required for dependency resolution.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY ./apps/notifications/package.json ./apps/notifications/package.json

# Install dependencies.
RUN pnpm install --frozen-lockfile

# Build the application.
COPY ./apps/notifications ./apps/notifications
RUN pnpm --filter=@soulobby/notifications run build

# Deploy to a clean directory with only production dependencies.
RUN pnpm --filter=@soulobby/notifications deploy --prod /soulobby-production/notifications

# Final stage.
FROM node:lts-alpine

ENV NODE_ENV=production

# Copy the deployed application.
COPY --from=builder /soulobby-production/notifications /soulobby/apps/notifications

# Start the application.
WORKDIR /soulobby/apps/notifications
CMD ["npm", "run-script", "start"]
