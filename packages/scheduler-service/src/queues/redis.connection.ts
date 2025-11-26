import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

redisConnection.on('connect', () => {
    console.log('✅ Conectado ao Redis');
});

redisConnection.on('error', (err) => {
    console.error('❌ Erro no Redis:', err);
});
