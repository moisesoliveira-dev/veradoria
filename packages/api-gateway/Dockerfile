FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api-gateway/package*.json ./packages/api-gateway/

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY packages/shared ./packages/shared
COPY packages/api-gateway ./packages/api-gateway

# Build
RUN npm run build -w @cm/shared
RUN npm run build -w @cm/api-gateway

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@cm/api-gateway"]
