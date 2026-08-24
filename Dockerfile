FROM node:22-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package*.json pnpm-lock.yaml* ./

# Install all dependencies including devDependencies needed for build
RUN npm ci

# Copy full application source code
COPY . .

# Build application for production
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy application files and build artifacts
COPY --from=builder /app ./

# Expose Cloud Run default port
EXPOSE 8080

# Start production server
CMD ["npx", "vinext", "start", "-p", "8080", "-H", "0.0.0.0"]
