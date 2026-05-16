# Use official Node.js 20 image
FROM node:16

# Set working directory
WORKDIR /app

# Add node_modules binaries to PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy package files and install dependencies.
# Use `npm install` (not `npm ci`) so the `overrides` field in package.json
# is honored — needed to force ajv@8 and fix the schema-utils/ajv-keywords
# "Unknown keyword formatMinimum" crash from react-scripts 5.
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Expose port for React dev server
EXPOSE 3000

# Set environment variable so CRA binds to all interfaces
ENV HOST=0.0.0.0

# Start the app
CMD ["npm", "start"]
