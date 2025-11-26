FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/chatbot-service/package*.json ./packages/chatbot-service/

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY packages/shared ./packages/shared
COPY packages/chatbot-service ./packages/chatbot-service

# Build
RUN npm run build -w @cm/shared
RUN npm run build -w @cm/chatbot-service

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "@cm/chatbot-service"]
