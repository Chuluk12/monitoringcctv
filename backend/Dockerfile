FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@12.4.2 \
  && pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
EXPOSE 4000
CMD ["node", "src/server.js"]
