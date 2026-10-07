FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@12.4.2 \
  && pnpm install --frozen-lockfile --prod
COPY src ./src
EXPOSE 4000
CMD ["npm","start"]
