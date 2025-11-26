import {
    getEstadoCliente,
    criarEstadoCliente,
    atualizarEstadoCliente,
    renovarUuidVerificacao,
    finalizarAtendimento,
    getEtapaById,
    getEtapas,
    getProximaEtapa,
    adicionarMensagemHistorico,
    salvarArquivo,
    getArquivosDoEstado,
    EstadoCliente,
    Etapa,
    MensagemHistorico,
    DadosColetados
} from '@cm/shared';
import { ProcessMessageRequest } from '../routes/process';
import { GeminiService } from '../services/gemini.service';
import { GosacService } from '../services/gosac.service';
import { GoogleDriveService } from '../services/googledrive.service';
import { SchedulerService } from '../services/scheduler.service';
import { v4 as uuidv4 } from 'uuid';

export class ChatbotController {
    private gemini: GeminiService;
    private gosac: GosacService;
    private googleDrive: GoogleDriveService;
    private scheduler: SchedulerService;

    constructor() {
        this.gemini = new GeminiService();
        this.gosac = new GosacService();
        this.googleDrive = new GoogleDriveService();
        this.scheduler = new SchedulerService();
    }

    async processarMensagem(mensagem: ProcessMessageRequest) {
        try {
            // 1. Buscar ou criar estado do cliente
            let estado = await getEstadoCliente(mensagem.contactId, mensagem.ticketId);

            if (!estado) {
                // Novo atendimento - buscar primeira etapa
                const etapas = await getEtapas();
                const primeiraEtapa = etapas[0];

                if (!primeiraEtapa) {
                    throw new Error('Nenhuma etapa cadastrada no sistema');
                }

                estado = await criarEstadoCliente(
                    mensagem.contactId,
                    mensagem.ticketId,
                    primeiraEtapa.id
                );
                console.log(`📝 Novo atendimento criado para contato ${mensagem.contactId}`);
            }

            // 2. Se o atendimento já foi finalizado, ignorar
            if (estado.finalizada_em) {
                console.log('⏭️ Atendimento já finalizado');
                return { success: true, status: 'already_finished' };
            }

            // 3. Renovar UUID de verificação (cancela timeout anterior)
            const novoUuid = await renovarUuidVerificacao(estado.id);
            console.log(`🔄 UUID de verificação renovado: ${novoUuid}`);

            // 4. Buscar etapa atual
            const etapaAtual = await getEtapaById(estado.etapa_id);
            if (!etapaAtual) {
                throw new Error(`Etapa ${estado.etapa_id} não encontrada`);
            }

            // 5. Salvar arquivo se houver
            if (mensagem.mediaUrl && mensagem.mediaType !== 'chat') {
                console.log(`📎 Arquivo recebido: ${mensagem.mediaType}`);

                // Upload para Google Drive
                const caminhoGoogleDrive = await this.googleDrive.uploadArquivo(
                    mensagem.mediaUrl,
                    mensagem.contactName,
                    mensagem.mediaType
                );

                await salvarArquivo(
                    estado.id,
                    mensagem.contactId,
                    mensagem.mediaUrl,
                    mensagem.mediaType,
                    caminhoGoogleDrive
                );
            }

            // 6. Adicionar mensagem do cliente ao histórico
            const mensagemCliente: MensagemHistorico = {
                papel: 'cliente',
                conteudo: mensagem.body || '[arquivo]',
                timestamp: new Date().toISOString(),
                mediaUrl: mensagem.mediaUrl || undefined,
                mediaType: mensagem.mediaType
            };
            await adicionarMensagemHistorico(estado.id, mensagemCliente);

            // Atualizar timestamp da última mensagem do cliente
            await atualizarEstadoCliente(estado.id, {
                ultima_mensagem_cliente: new Date()
            });

            // Recarregar estado com histórico atualizado
            estado = (await getEstadoCliente(mensagem.contactId, mensagem.ticketId))!;

            // 7. Buscar quantidade de arquivos
            const arquivos = await getArquivosDoEstado(estado.id);

            // 8. Preparar contexto para a IA
            const contexto = this.prepararContexto(
                etapaAtual,
                estado,
                mensagem.contactName,
                arquivos.length
            );

            // 9. Gerar resposta com Gemini
            const respostaIA = await this.gemini.gerarResposta(
                contexto,
                estado.historico_mensagens,
                mensagem.body || '[arquivo enviado]'
            );

            console.log(`🤖 Resposta gerada: ${respostaIA.mensagem.substring(0, 50)}...`);

            // 10. Atualizar dados coletados
            const novosDados = {
                ...estado.dados_coletados,
                ...respostaIA.dados_extraidos
            };

            // 11. Adicionar resposta ao histórico
            const mensagemAssistente: MensagemHistorico = {
                papel: 'assistente',
                conteudo: respostaIA.mensagem,
                timestamp: new Date().toISOString()
            };
            await adicionarMensagemHistorico(estado.id, mensagemAssistente);

            // 12. Verificar se deve avançar etapa
            let novaEtapaId = estado.etapa_id;
            if (respostaIA.avancar_etapa) {
                const proximaEtapa = await getProximaEtapa(etapaAtual.ordem);
                if (proximaEtapa) {
                    novaEtapaId = proximaEtapa.id;
                    console.log(`➡️ Avançando para etapa: ${proximaEtapa.nome}`);
                }
            }

            // 13. Atualizar estado
            await atualizarEstadoCliente(estado.id, {
                etapa_id: novaEtapaId,
                dados_coletados: novosDados,
                ultima_mensagem_ia: new Date()
            });

            // 14. Enviar mensagem via Gosac
            await this.gosac.enviarMensagem(mensagem.ticketId, respostaIA.mensagem);
            console.log(`📤 Mensagem enviada para ticket ${mensagem.ticketId}`);

            // 15. Agendar verificação de timeout
            await this.scheduler.agendarTimeout({
                estado_cliente_id: estado.id,
                contact_id: mensagem.contactId,
                ticket_id: mensagem.ticketId,
                uuid_verificacao: novoUuid,
                etapa_atual: etapaAtual.nome,
                contexto_resumido: this.resumirContexto(estado, etapaAtual)
            });

            // 16. Se deve finalizar atendimento
            if (respostaIA.finalizar_atendimento) {
                await finalizarAtendimento(estado.id);
                console.log(`✅ Atendimento finalizado para contato ${mensagem.contactId}`);
            }

            return {
                success: true,
                estado_id: estado.id,
                etapa_atual: etapaAtual.nome,
                avancar_etapa: respostaIA.avancar_etapa,
                finalizado: respostaIA.finalizar_atendimento
            };

        } catch (error) {
            console.error('❌ Erro no processamento:', error);
            throw error;
        }
    }

    private prepararContexto(
        etapa: Etapa,
        estado: EstadoCliente,
        nomeContato: string,
        quantidadeArquivos: number
    ): string {
        let prompt = etapa.prompt_sistema;

        // Substituir variáveis no prompt
        prompt = prompt.replace(/\{\{nome_contato\}\}/g, nomeContato);
        prompt = prompt.replace(/\{\{nome_completo\}\}/g, estado.dados_coletados.nome_completo || nomeContato);
        prompt = prompt.replace(/\{\{dados_coletados\}\}/g, JSON.stringify(estado.dados_coletados));
        prompt = prompt.replace(/\{\{quantidade_arquivos\}\}/g, String(quantidadeArquivos));
        prompt = prompt.replace(/\{\{ambiente_interesse\}\}/g, estado.dados_coletados.ambiente_interesse as string || 'não informado');

        // Substituir condicional de visita
        const seQuerVisita = estado.dados_coletados.quer_agendar_visita
            ? '✅ Visita técnica: Sim! Nossa equipe entrará em contato para agendar.'
            : '❌ Visita técnica: Não solicitada';
        prompt = prompt.replace(/\{\{se_quer_visita\}\}/g, seQuerVisita);

        return prompt;
    }

    private resumirContexto(estado: EstadoCliente, etapa: Etapa): string {
        return `Cliente na etapa "${etapa.nome}". Dados: ${JSON.stringify(estado.dados_coletados)}`;
    }
}
