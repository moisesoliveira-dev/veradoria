import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { scheduleRouter } from './routes/schedule';
import { healthRouter } from './routes/health';
import { TimeoutWorker } from './workers/timeout.worker';

// Carregar .env - funciona tanto local quanto em produção
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback para variáveis de ambiente do sistema

const app = express();
const PORT = process.env.SCHEDULER_SERVICE_PORT || 3002;

app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rotas
app.use('/health', healthRouter);
app.use('/schedule', scheduleRouter);

// Inicializar Worker
const timeoutWorker = new TimeoutWorker();
timeoutWorker.start();

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Erro:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log(`⏰ Scheduler Service rodando na porta ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Encerrando worker...');
    await timeoutWorker.stop();
    process.exit(0);
});
