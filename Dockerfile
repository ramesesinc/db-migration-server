FROM node:10-alpine

# create workdir
WORKDIR /apps/server

# install dependencies
COPY . .

RUN npm install

ARG DOCKER_ENV
ENV NODE_ENV=${DOCKER_ENV}
RUN echo NODE_ENV is $NODE_ENV

# if building for production
RUN npm ci --only=production

CMD ["npm", "run", "start"]
