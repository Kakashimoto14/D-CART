FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

COPY src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
