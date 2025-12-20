# Multi-stage build for ContentSys
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd client && npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Force development mode during build to install devDependencies
ENV NODE_ENV=development

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci
RUN cd client && npm ci

# Copy source code
COPY . .

# Build client and server
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 contentapp

# Copy built application
COPY --from=builder --chown=contentapp:nodejs /app/dist ./dist
COPY --from=builder --chown=contentapp:nodejs /app/client/dist ./client/dist
COPY --from=deps --chown=contentapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=contentapp:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads && chown contentapp:nodejs uploads

# Switch to non-root user
USER contentapp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]