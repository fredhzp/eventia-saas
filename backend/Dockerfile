FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts .
RUN npx prisma generate
COPY src ./src
EXPOSE 4000
CMD sh -c "npx prisma migrate deploy && node src/index.js"
