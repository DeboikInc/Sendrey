FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .

COPY services/api ./services/api

RUN pnpm install --frozen-lockfile

WORKDIR /app/services/api

EXPOSE 10000

CMD ["node", "app.js"]