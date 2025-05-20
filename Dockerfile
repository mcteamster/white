FROM node:22-alpine
WORKDIR /white
COPY . /white
RUN npm ci
EXPOSE 80
CMD npm run serve
