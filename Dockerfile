FROM node:22
WORKDIR /white
COPY .. /white
RUN npm ci
EXPOSE 80
ENV TZ="Australia/Melbourne"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
CMD npm run serve
