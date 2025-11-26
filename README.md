# CM Modulados - Chatbot IA 🤖

Sistema de chatbot com IA para atendimento automatizado da CM Modulados, usando Gemini e integração com Gosac.

## 📋 Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│     Gosac       │────▶│   API Gateway    │────▶│  Chatbot Service   │
│   (WhatsApp)    │◀────│   (porta 3000)   │     │   (porta 3001)     │
└─────────────────┘     └──────────────────┘     └────────────────────┘
                                                          │
                                                          ▼
                        ┌──────────────────┐     ┌────────────────────┐
                        │  Scheduler Svc   │◀────│   PostgreSQL       │
                        │  (porta 3002)    │     │   (Railway)        │
                        └────────┬─────────┘     └────────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │     Redis        │
                        │  (Bull Queue)    │
                        └──────────────────┘
```

## 🚀 Deploy no Railway

### 1. Criar Serviços no Railway

Crie 4 serviços no Railway:
1. **PostgreSQL** (já existe)
2. **Redis** (adicione do marketplace)
3. **api-gateway** (deploy do código)
4. **chatbot-service** (deploy do código)
5. **scheduler-service** (deploy do código)

### 2. Configurar Variáveis de Ambiente

Para cada serviço, configure as variáveis:

```env
# Todos os serviços precisam
DATABASE_URL=postgresql://postgres:jGJpCKPETwHldHpZQsqfHkkcIxXvfefh@nozomi.proxy.rlwy.net:19245/railway
NODE_ENV=production

# API Gateway
API_GATEWAY_PORT=3000
CHATBOT_SERVICE_URL=http://chatbot-service.railway.internal:3001

# Chatbot Service
CHATBOT_SERVICE_PORT=3001
SCHEDULER_SERVICE_URL=http://scheduler-service.railway.internal:3002
GEMINI_API_KEY=AIzaSyC_Er0gKlLbeS7fA3DHHo_FiKeq3r_ZDi4
GOSAC_BASE_URL=https://cmmodulados.gosac.com.br
GOSAC_TOKEN=INTEGRATION 0ddfe6600ac270ae602f509c3bf247dd8b581fe6672dc48fcb2853d91328
GOOGLE_DRIVE_FOLDER_ID=<seu_folder_id>
GOOGLE_SERVICE_ACCOUNT_JSON=<json_da_service_account>

# Scheduler Service
SCHEDULER_SERVICE_PORT=3002
REDIS_URL=<url_do_redis_railway>
TIMEOUT_MINUTES=30
```

### 3. Configurar Build

Para cada serviço no Railway, configure:

**API Gateway:**
- Root Directory: `/`
- Build Command: `npm install && npm run build -w @cm/shared && npm run build -w @cm/api-gateway`
- Start Command: `npm run start -w @cm/api-gateway`

**Chatbot Service:**
- Root Directory: `/`
- Build Command: `npm install && npm run build -w @cm/shared && npm run build -w @cm/chatbot-service`
- Start Command: `npm run start -w @cm/chatbot-service`

**Scheduler Service:**
- Root Directory: `/`
- Build Command: `npm install && npm run build -w @cm/shared && npm run build -w @cm/scheduler-service`
- Start Command: `npm run start -w @cm/scheduler-service`

### 4. Inicializar Banco de Dados

Execute o script SQL no seu PostgreSQL:

```bash
psql $DATABASE_URL -f scripts/init.sql
```

### 5. Popular Etapas

Após inicializar o banco, rode o seed:

```bash
npm run db:seed
```

### 6. Configurar Webhook no Gosac

Configure o webhook do Gosac para apontar para:
```
https://seu-api-gateway.railway.app/webhook/gosac
```

## 📱 Fluxo de Atendimento

1. **Boas Vindas** - Apresentação e coleta do nome/ambiente
2. **Coleta de Projeto** - Solicita fotos, plantas ou medidas
3. **Agendamento** - Pergunta se quer visita técnica
4. **Finalização** - Resumo e despedida

## ⏰ Sistema de Timeout

- Após 30 minutos sem resposta, envia mensagem automática
- Apenas 1 mensagem de timeout por atendimento
- Se cliente responder, timeout é cancelado/reiniciado

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar localmente (3 terminais)
npm run dev:gateway
npm run dev:chatbot
npm run dev:scheduler

# Rodar seed
npm run db:seed
```

## 📁 Estrutura

```
├── packages/
│   ├── api-gateway/       # Recebe webhooks, roteia
│   ├── chatbot-service/   # Lógica IA, estados, respostas
│   ├── scheduler-service/ # Bull + Redis, timeout
│   └── shared/            # Tipos, DB, utils
├── scripts/
│   └── init.sql           # Schema do banco
└── .env.example           # Variáveis de ambiente
```

## 🎯 Adicionar Novas Etapas

Para adicionar etapas, insira no banco na tabela `etapas`:

```sql
INSERT INTO etapas (nome, descricao, ordem, prompt_sistema, requisitos)
VALUES (
  'nome_etapa',
  'Descrição da etapa',
  5, -- ordem (próxima após finalização)
  'Prompt do sistema para a IA...',
  '{"campos_obrigatorios": ["campo1"]}'::jsonb
);
```

## 📞 Suporte

Desenvolvido para CM Modulados - Móveis Planejados 💜
