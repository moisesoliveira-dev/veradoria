import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'scheduler-service',
        timestamp: new Date().toISOString()
    });
});
