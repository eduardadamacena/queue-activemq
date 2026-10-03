FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# O comando (api ou worker) é definido no docker-compose.yml
CMD ["npm", "run", "api"]
