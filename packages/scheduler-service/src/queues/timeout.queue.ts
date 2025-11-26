import { Queue } from 'bullmq';
import { TimeoutJob } from '@cm/shared';
import { redisConnection } from './redis.connection';

export const timeoutQueue = new Queue<TimeoutJob>('timeout-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});

console.log('📤 Timeout Queue inicializada');
