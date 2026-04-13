FROM node:20-slim

WORKDIR /app

# Instala dependências do Baileys (sharp, canvas)
RUN apt-get update && apt-get install -y \
  python3 make g++ libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

# Pasta de sessões persistente (montar como volume)
RUN mkdir -p /app/sessoes

EXPOSE 3001

CMD ["node", "dist/index.js"]
