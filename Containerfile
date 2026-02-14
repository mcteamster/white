FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80 \
    TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'
COPY package.json.server package.json
RUN npm install --omit=dev
COPY src/server.ts src/Game.ts src/Cards.ts src/
COPY src/lib/constants.ts src/lib/
EXPOSE 80
CMD ["node", "-r", "ts-node/register", "./src/server.ts"]
