import { Router, Request, Response } from 'express';
import { TimeoutJob } from '@cm/shared';
import { timeoutQueue } from '../queues/timeout.queue';

export const scheduleRouter = Router();

const TIMEOUT_MINUTES = parseInt(process.env.TIMEOUT_MINUTES || '30', 10);
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

// Agendar verificação de timeout
scheduleRouter.post('/timeout', async (req: Request<{}, {}, TimeoutJob>, res: Response) => {
    try {
        const job = req.body;

        console.log(`📥 Recebendo agendamento para estado ${job.estado_cliente_id}`);

        // Primeiro, remover jobs antigos do mesmo cliente (mesmo contact_id)
        const existingJobs = await timeoutQueue.getJobs(['delayed', 'waiting']);

        for (const existingJob of existingJobs) {
            if (existingJob.data.contact_id === job.contact_id) {
                console.log(`🗑️ Removendo job antigo ${existingJob.id} do contato ${job.contact_id}`);
                await existingJob.remove();
            }
        }

        // Agendar novo job
        const newJob = await timeoutQueue.add(
            'timeout-check',
            job,
            {
                delay: TIMEOUT_MS,
                jobId: `timeout-${job.uuid_verificacao}`, // ID único baseado no UUID
                removeOnComplete: true,
                removeOnFail: false
            }
        );

        console.log(`✅ Job agendado: ${newJob.id} - executa em ${TIMEOUT_MINUTES} minutos`);

        return res.json({
            success: true,
            jobId: newJob.id,
            executeAt: new Date(Date.now() + TIMEOUT_MS).toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao agendar timeout:', error);
        return res.status(500).json({ success: false, error: 'Erro ao agendar' });
    }
});

// Cancelar timeout por UUID
scheduleRouter.delete('/timeout/:uuid', async (req: Request, res: Response) => {
    try {
        const { uuid } = req.params;
        const jobId = `timeout-${uuid}`;

        const job = await timeoutQueue.getJob(jobId);

        if (job) {
            await job.remove();
            console.log(`🚫 Job ${jobId} cancelado`);
            return res.json({ success: true, message: 'Job cancelado' });
        }

        return res.json({ success: true, message: 'Job não encontrado (já executado ou expirado)' });

    } catch (error) {
        console.error('❌ Erro ao cancelar timeout:', error);
        return res.status(500).json({ success: false, error: 'Erro ao cancelar' });
    }
});

// Listar jobs pendentes (para debug)
scheduleRouter.get('/pending', async (req: Request, res: Response) => {
    try {
        const delayedJobs = await timeoutQueue.getJobs(['delayed']);
        const waitingJobs = await timeoutQueue.getJobs(['waiting']);

        const jobs = [...delayedJobs, ...waitingJobs].map(job => ({
            id: job.id,
            contactId: job.data.contact_id,
            estadoId: job.data.estado_cliente_id,
            uuid: job.data.uuid_verificacao,
            processAt: job.processedOn ? new Date(job.processedOn) : 'pendente'
        }));

        return res.json({ count: jobs.length, jobs });

    } catch (error) {
        console.error('❌ Erro ao listar jobs:', error);
        return res.status(500).json({ success: false, error: 'Erro ao listar' });
    }
});
