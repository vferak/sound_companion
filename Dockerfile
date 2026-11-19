FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy application files
COPY src ./src
COPY public ./public
COPY tsconfig.json ./

# Create directory for SQLite database (writable by the app user)
RUN mkdir -p /app/data && \
    chown -R bun:bun /app

# Run as non-root user
USER bun

EXPOSE 3700

CMD ["bun", "run", "start"]
