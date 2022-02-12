FROM node:latest
WORKDIR /app

COPY . .

RUN npm install -g typescript && npm install

EXPOSE 8899

CMD ["node", "index.js"]
