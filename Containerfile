FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80
RUN npm install --omit=dev boardgame.io nanoid@5 ts-node@10 typescript@5.6.3
COPY src/server.ts src/Game.ts src/Cards.ts src/
COPY src/lib/constants.ts src/lib/
EXPOSE 80
CMD ["node", "-r", "ts-node/register", "./src/server.ts"]
