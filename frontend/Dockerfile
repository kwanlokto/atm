FROM node:22-alpine

WORKDIR /app

ENV PATH="/app/node_modules/.bin:$PATH"

# Only copy package.json — never the host's package-lock.json. npm locks
# optional-dep platform binaries (rollup, esbuild) to whoever ran `npm install`
# last, so a Windows or macOS lockfile is missing the linux-musl variants
# this container needs. See https://github.com/npm/cli/issues/4828.
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host"]
