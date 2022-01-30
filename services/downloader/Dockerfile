FROM node:12.16.0-stretch-slim

WORKDIR /etc/downloader
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]