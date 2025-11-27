# ============================================
# AsylumLaw Voice Assistant - Production Dockerfile
# ============================================
# Runtime: Node.js 18 (Express webhook server)
# Purpose: VAPI voice assistant webhook handler
# Note: No audio libraries needed - VAPI handles audio processing externally
# ============================================

FROM node:18-alpine AS base

# Add labels for container registry
LABEL org.opencontainers.image.source="https://github.com/arvanittelaku/vapi-asylum-law-voice-assistant"
LABEL org.opencontainers.image.description="VAPI Voice Assistant for AsylumLaw"
LABEL org.opencontainers.image.version="1.0.0"

# ============================================
# Dependencies stage - leverage layer caching
# ============================================
FROM base AS deps

WORKDIR /app

# Copy package files first (cache layer if unchanged)
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Production stage
# ============================================
FROM base AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code (only what's needed for runtime)
COPY server.js ./
COPY src ./src

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose the webhook server port
EXPOSE 3000

# Health check for ECS/load balancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "server.js"]

