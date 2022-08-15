FROM node:16-alpine

RUN addgroup app && adduser -S -G app app
USER app

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

CMD ["npm", "run", "serve"]
