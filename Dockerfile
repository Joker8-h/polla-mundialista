FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate && npm run build

EXPOSE 3000

CMD npx prisma db push && npm run start
