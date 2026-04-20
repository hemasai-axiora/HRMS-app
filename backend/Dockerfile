FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
COPY src ./src/
COPY schema.prisma ./
COPY .env ./
RUN mv schema.prisma prisma/schema.prisma

RUN npx prisma generate

EXPOSE 5000

CMD ["node", "src/index.js"]