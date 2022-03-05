FROM node:latest
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

COPY . .

RUN npm install -g typescript && npm install
RUN npm install -g prisma
RUN npx prisma generate
RUN tsc

EXPOSE 8899

CMD ["node", "index.js"]
