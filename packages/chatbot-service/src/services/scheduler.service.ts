import axios from 'axios';
import { TimeoutJob } from '@cm/shared';

export class SchedulerService {
    private schedulerUrl: string;

    constructor() {
        this.schedulerUrl = process.env.SCHEDULER_SERVICE_URL || 'http://localhost:3002';
    }

    async agendarTimeout(job: TimeoutJob): Promise<boolean> {
        try {
            const response = await axios.post(
                `${this.schedulerUrl}/schedule/timeout`,
                job,
                { timeout: 5000 }
            );

            console.log(`⏰ Timeout agendado para estado ${job.estado_cliente_id}`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao agendar timeout:', error);
            // Não lançar erro - timeout é secundário
            return false;
        }
    }

    async cancelarTimeout(uuidVerificacao: string): Promise<boolean> {
        try {
            const response = await axios.delete(
                `${this.schedulerUrl}/schedule/timeout/${uuidVerificacao}`,
                { timeout: 5000 }
            );

            console.log(`🚫 Timeout cancelado: ${uuidVerificacao}`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao cancelar timeout:', error);
            return false;
        }
    }
}
