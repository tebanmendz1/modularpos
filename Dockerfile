# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source files
COPY . .

# Build Vite SPA frontend and bundled Node backend
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built application assets from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run production server
CMD ["node", "dist/server.cjs"]
