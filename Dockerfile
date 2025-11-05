FROM node:24-alpine
WORKDIR /white
COPY . /white
RUN npm ci
EXPOSE 80
CMD npm run serve
