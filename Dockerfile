# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && npm ci --omit=dev && npm install tsx drizzle-kit bcrypt && apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./

RUN chmod +x scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
