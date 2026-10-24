# Multi-Stage Production Dockerfile for Calories Platform
# Stage 1: Build Client and Server
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root workspace manifests
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm install --prefix client
RUN npm install --prefix server

# Copy full source trees
COPY client/ ./client/
COPY server/ ./server/

# Build client and server artifacts
RUN npm run build --prefix client
RUN npm run build --prefix server

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy server package manifest and install production dependencies only
COPY server/package.json ./server/
RUN npm install --prefix server --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose backend port
EXPOSE 5000

# Start production server
CMD ["node", "server/dist/server.js"]
