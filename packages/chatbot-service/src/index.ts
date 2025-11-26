import dotenv from 'dotenv';
import path from 'path';

// Carregar .env ANTES de qualquer import que precise das variáveis
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Carregando .env de:', envPath);
dotenv.config({ path: envPath });
dotenv.config(); // fallback

import express from 'express';
import { processRouter } from './routes/process';
import { healthRouter } from './routes/health';

const app = express();
const PORT = process.env.CHATBOT_SERVICE_PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rotas
app.use('/health', healthRouter);
app.use('/process', processRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Erro:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log(`🤖 Chatbot Service rodando na porta ${PORT}`);
});
