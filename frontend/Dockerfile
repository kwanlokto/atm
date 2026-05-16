# Node 18 LTS — best-matched to react-scripts 5.0.1's dependency tree.
FROM node:18-bookworm-slim

# Set working directory
WORKDIR /app

# Add node_modules binaries to PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy package files and install dependencies.
# `package-lock.json` is optional (use a glob) — when absent, npm resolves
# fresh from package.json so `overrides` + the direct ajv/ajv-keywords deps
# are applied without being re-pinned by a stale lockfile.
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Expose port for React dev server
EXPOSE 3000

# Set environment variable so CRA binds to all interfaces
ENV HOST=0.0.0.0

# Start the app
CMD ["npm", "start"]
