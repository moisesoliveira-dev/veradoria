FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/scheduler-service/package*.json ./packages/scheduler-service/

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY packages/shared ./packages/shared
COPY packages/scheduler-service ./packages/scheduler-service

# Build
RUN npm run build -w @cm/shared
RUN npm run build -w @cm/scheduler-service

EXPOSE 3002

CMD ["npm", "run", "start", "-w", "@cm/scheduler-service"]
