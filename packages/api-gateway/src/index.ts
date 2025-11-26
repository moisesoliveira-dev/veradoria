import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { webhookRouter } from './routes/webhook';
import { healthRouter } from './routes/health';

// Carregar .env - funciona tanto local quanto em produção
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback para variáveis de ambiente do sistema

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging simples
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rotas
app.use('/health', healthRouter);
app.use('/webhook', webhookRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Erro:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 API Gateway rodando na porta ${PORT}`);
    console.log(`📡 Webhook endpoint: POST /webhook/gosac`);
});
