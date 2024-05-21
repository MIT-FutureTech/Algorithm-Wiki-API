FROM node:current-alpine3.19

RUN mkdir -p /app
WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN apk add --update python3 make g++\
&& rm -rf /var/cache/apk/*
RUN apk add --no-cache bash

RUN yarn add dotenv
RUN yarn -python=python3

COPY . /app

CMD ["yarn", "run", "start"]