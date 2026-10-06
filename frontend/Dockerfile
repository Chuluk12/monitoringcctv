FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time, not read at
# container start - so they must arrive as build ARGs (see docker-compose.yml),
# not as runtime `environment:`.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBRTC_BASE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEBRTC_BASE=$NEXT_PUBLIC_WEBRTC_BASE

RUN npm run build
EXPOSE 3000
CMD ["npm","start"]
