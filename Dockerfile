FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "scripts/containerHealthcheck.js"]
CMD ["node", "server.js"]
