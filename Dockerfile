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

# Expose port (adjust if your app uses a different port)
EXPOSE 3700

# Run the application
CMD ["bun", "run", "start"]
