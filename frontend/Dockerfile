# Use official Node.js 20 image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Add node_modules binaries to PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Expose port for React dev server
EXPOSE 3000

# Set environment variable so CRA binds to all interfaces
ENV HOST=0.0.0.0

# Start the app
CMD ["npm", "start"]
