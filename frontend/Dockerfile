# pull official base image
FROM node:20-alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json package-lock.json ./
# use npm ci for reproducible installs
RUN npm ci --silent

# add app
COPY . .

# start app
CMD ["npm", "start"]
