# Builder stage.
FROM node:lts-alpine AS builder

WORKDIR /soulobby

# Install pnpm.
RUN npm install --global pnpm@10.20.0

# Copy the monorepo files required for dependency resolution.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY ./apps/soulobby/package.json ./apps/soulobby/package.json

# Install dependencies.
RUN pnpm install --frozen-lockfile

# Build the application.
COPY ./apps/soulobby ./apps/soulobby
RUN pnpm --filter=soulobby run build

# Deploy to a clean directory with only production dependencies.
RUN pnpm --filter=soulobby deploy --prod /soulobby-production/soulobby

# Final stage.
FROM node:lts-alpine

ENV NODE_ENV=production

# Copy the deployed application.
COPY --from=builder /soulobby-production/soulobby /soulobby/apps/soulobby

# Start the application.
WORKDIR /soulobby/apps/soulobby
CMD ["npm", "run-script", "start"]
