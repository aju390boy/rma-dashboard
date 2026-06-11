FROM node:22-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "index.js"]
