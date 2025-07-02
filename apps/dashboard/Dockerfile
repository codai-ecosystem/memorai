FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true

# Build the application
RUN npm run build

# Expose port
EXPOSE 6366

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:6366 || exit 1

# Start the application
CMD ["npm", "start"]
