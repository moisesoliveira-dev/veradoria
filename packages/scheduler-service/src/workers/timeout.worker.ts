import { Worker, Job } from 'bullmq';
import { TimeoutJob, getEstadoClienteByUuid, getEtapaById, marcarTimeoutVerificado } from '@cm/shared';
import { redisConnection } from '../queues/redis.connection';
import axios from 'axios';

const GOSAC_BASE_URL = process.env.GOSAC_BASE_URL || '';
const GOSAC_TOKEN = process.env.GOSAC_TOKEN || '';

// Mensagem padrão de timeout
const MENSAGEM_TIMEOUT = `Oi! 😊 Percebi que você ficou um tempinho sem responder. Está tudo bem?

Se precisar de mais alguma informação sobre móveis planejados ou quiser continuar nosso atendimento, é só me chamar! 

A CM Modulados está à disposição para realizar o projeto dos seus sonhos! 💜`;

export class TimeoutWorker {
    private worker: Worker<TimeoutJob> | null = null;

    start() {
        this.worker = new Worker<TimeoutJob>(
            'timeout-queue',
            async (job: Job<TimeoutJob>) => {
                await this.processarTimeout(job.data);
            },
            {
                connection: redisConnection,
                concurrency: 5
            }
        );

        this.worker.on('completed', (job) => {
            console.log(`✅ Job ${job.id} completado`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`❌ Job ${job?.id} falhou:`, err.message);
        });

        console.log('🔄 Timeout Worker iniciado');
    }

    async stop() {
        if (this.worker) {
            await this.worker.close();
            console.log('⏹️ Timeout Worker parado');
        }
    }

    private async processarTimeout(data: TimeoutJob) {
        console.log(`⏰ Processando timeout para estado ${data.estado_cliente_id}`);

        try {
            // 1. Verificar se o estado ainda existe e se o UUID ainda é válido
            const estado = await getEstadoClienteByUuid(data.uuid_verificacao);

            if (!estado) {
                console.log(`⏭️ Estado não encontrado ou UUID inválido - cliente pode ter respondido`);
                return;
            }

            // 2. Verificar se já foi finalizado
            if (estado.finalizada_em) {
                console.log(`⏭️ Atendimento já finalizado - ignorando timeout`);
                return;
            }

            // 3. Verificar se timeout já foi verificado (evitar duplicatas)
            if (estado.timeout_verificado) {
                console.log(`⏭️ Timeout já verificado anteriormente - ignorando`);
                return;
            }

            // 4. Verificar se cliente respondeu depois do agendamento
            if (estado.ultima_mensagem_cliente) {
                const ultimaMensagemCliente = new Date(estado.ultima_mensagem_cliente);
                const ultimaMensagemIA = estado.ultima_mensagem_ia ? new Date(estado.ultima_mensagem_ia) : null;

                // Se cliente respondeu depois da última mensagem da IA, ignorar timeout
                if (ultimaMensagemIA && ultimaMensagemCliente > ultimaMensagemIA) {
                    console.log(`⏭️ Cliente respondeu após última mensagem - ignorando timeout`);
                    return;
                }
            }

            // 5. Marcar timeout como verificado (para não enviar múltiplas vezes)
            await marcarTimeoutVerificado(estado.id);

            // 6. Enviar mensagem de timeout via Gosac
            await this.enviarMensagemGosac(data.ticket_id, MENSAGEM_TIMEOUT);

            console.log(`📤 Mensagem de timeout enviada para ticket ${data.ticket_id}`);

        } catch (error) {
            console.error('❌ Erro ao processar timeout:', error);
            throw error; // Re-throw para BullMQ tentar novamente
        }
    }

    private async enviarMensagemGosac(ticketId: number, mensagem: string): Promise<void> {
        const url = `${GOSAC_BASE_URL}/api/messages/${ticketId}`;

        await axios.post(
            url,
            { body: mensagem },
            {
                headers: {
                    'Authorization': GOSAC_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
    }
}
