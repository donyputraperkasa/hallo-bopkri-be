# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code and build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npm run build
RUN npx prisma generate
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Create directory for uploads
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "dist/main"]
