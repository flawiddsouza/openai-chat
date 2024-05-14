FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

# Set PORT
EXPOSE 80

# Start the application
CMD ["node", "src/main.js"]
