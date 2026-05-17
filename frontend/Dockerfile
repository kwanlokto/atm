# Node 18 LTS — best-matched to react-scripts 5.0.1.
FROM node:18-bookworm-slim

WORKDIR /app

# Pin to npm 9. npm 10 (default in recent node:18 images) hoists this
# dep tree differently than npm 9, which is what landed the broken
# top-level ajv-keywords that crashed the dev server.
RUN npm install -g npm@9

ENV PATH="/app/node_modules/.bin:$PATH"

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 3000

ENV HOST=0.0.0.0
CMD ["npm", "start"]
