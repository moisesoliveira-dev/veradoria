# 🚀 Guia de Deploy - CM Modulados Chatbot

## Pré-requisitos no Railway

Certifique-se de ter:
1. ✅ PostgreSQL rodando
2. ⬜ Redis (adicione do marketplace Railway)

---

## Passo 1: Criar o Redis no Railway

1. Acesse seu projeto no Railway
2. Clique em **"+ New"** → **"Database"** → **"Redis"**
3. Aguarde a criação
4. Copie a URL de conexão (REDIS_URL)

---

## Passo 2: Executar SQL no PostgreSQL

Execute o script `scripts/init.sql` no seu PostgreSQL Railway:

```sql
-- Execute no Query do Railway ou via psql
-- O conteúdo está em scripts/init.sql
```

---

## Passo 3: Criar os 3 Serviços

### Serviço 1: API Gateway

1. **"+ New"** → **"GitHub Repo"** → Selecione este repositório
2. **Settings:**
   - **Name:** `api-gateway`
   - **Root Directory:** `/` (deixe vazio)
   - **Build Command:** 
     ```
     npm install && npm run build -w @cm/shared && npm run build -w @cm/api-gateway
     ```
   - **Start Command:**
     ```
     npm run start -w @cm/api-gateway
     ```

3. **Variables:**
   ```
   DATABASE_URL=<sua_url_postgres>
   NODE_ENV=production
   API_GATEWAY_PORT=3000
   CHATBOT_SERVICE_URL=http://chatbot-service.railway.internal:3001
   ```

4. **Networking:** Gere um domínio público (este será o webhook do Gosac)

---

### Serviço 2: Chatbot Service

1. **"+ New"** → **"GitHub Repo"** → Selecione este repositório
2. **Settings:**
   - **Name:** `chatbot-service`
   - **Build Command:**
     ```
     npm install && npm run build -w @cm/shared && npm run build -w @cm/chatbot-service
     ```
   - **Start Command:**
     ```
     npm run start -w @cm/chatbot-service
     ```

3. **Variables:**
   ```
   DATABASE_URL=<sua_url_postgres>
   NODE_ENV=production
   CHATBOT_SERVICE_PORT=3001
   SCHEDULER_SERVICE_URL=http://scheduler-service.railway.internal:3002
   GEMINI_API_KEY=AIzaSyC_Er0gKlLbeS7fA3DHHo_FiKeq3r_ZDi4
   GOSAC_BASE_URL=https://cmmodulados.gosac.com.br
   GOSAC_TOKEN=INTEGRATION 0ddfe6600ac270ae602f509c3bf247dd8b581fe6672dc48fcb2853d91328
   GOOGLE_DRIVE_FOLDER_ID=<id_da_pasta_google_drive>
   GOOGLE_SERVICE_ACCOUNT_JSON=<json_da_service_account>
   ```

4. **Networking:** Apenas rede privada (internal)

---

### Serviço 3: Scheduler Service

1. **"+ New"** → **"GitHub Repo"** → Selecione este repositório
2. **Settings:**
   - **Name:** `scheduler-service`
   - **Build Command:**
     ```
     npm install && npm run build -w @cm/shared && npm run build -w @cm/scheduler-service
     ```
   - **Start Command:**
     ```
     npm run start -w @cm/scheduler-service
     ```

3. **Variables:**
   ```
   DATABASE_URL=<sua_url_postgres>
   REDIS_URL=<sua_url_redis>
   NODE_ENV=production
   SCHEDULER_SERVICE_PORT=3002
   TIMEOUT_MINUTES=30
   GOSAC_BASE_URL=https://cmmodulados.gosac.com.br
   GOSAC_TOKEN=INTEGRATION 0ddfe6600ac270ae602f509c3bf247dd8b581fe6672dc48fcb2853d91328
   ```

4. **Networking:** Apenas rede privada (internal)

---

## Passo 4: Popular as Etapas

Após deploy, execute o seed para criar as etapas:

**Opção 1 - Via Railway CLI:**
```bash
railway run npm run db:seed
```

**Opção 2 - Manualmente no PostgreSQL:**
Copie o conteúdo do arquivo `packages/shared/src/database/seed.ts` e adapte para SQL.

---

## Passo 5: Configurar Webhook no Gosac

1. Acesse as configurações do Gosac
2. Configure o webhook para:
   ```
   https://seu-api-gateway.railway.app/webhook/gosac
   ```

---

## Passo 6: Configurar Google Drive (Opcional)

1. Crie uma Service Account no Google Cloud Console
2. Ative a API do Google Drive
3. Crie uma pasta no Drive e compartilhe com o email da Service Account
4. Copie o ID da pasta (da URL)
5. Baixe o JSON da Service Account
6. Configure as variáveis `GOOGLE_DRIVE_FOLDER_ID` e `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## 🧪 Testando

### Health Check:
```bash
curl https://seu-api-gateway.railway.app/health
```

### Simular Webhook:
```bash
curl -X POST https://seu-api-gateway.railway.app/webhook/gosac \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "fromMe": false,
      "fromGroup": false,
      "body": "Olá!",
      "contactId": 12345,
      "ticketId": 1,
      "contact": {"name": "Teste", "number": "5511999999999"},
      "ticket": {"status": "open"}
    },
    "type": "messages:created"
  }'
```

---

## 📊 Monitoramento

- **Logs:** Railway Dashboard → Serviço → Logs
- **Jobs Pendentes:** `GET /schedule/pending` no scheduler-service

---

## 🆘 Problemas Comuns

### "Chatbot não responde"
- Verifique se `GEMINI_API_KEY` está configurada
- Verifique logs do chatbot-service

### "Timeout não funciona"
- Verifique se Redis está conectado
- Verifique logs do scheduler-service

### "Arquivos não salvam no Drive"
- Verifique `GOOGLE_SERVICE_ACCOUNT_JSON`
- Verifique se a pasta foi compartilhada com a Service Account
