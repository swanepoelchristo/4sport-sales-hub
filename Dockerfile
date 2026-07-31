FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock* bunfig.toml* ./
RUN bun install

COPY . .

RUN bun run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/server/index.mjs"]
