# Use Node.js Alpine for smaller image
FROM node:18-alpine

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy application files
COPY server.js ./

# Create directory for secure config
RUN mkdir -p /secure && \
    chown nodejs:nodejs /secure

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node server.js || exit 1

# Expose port for MCP
EXPOSE 8080

# Run the server
CMD ["node", "server.js"]
