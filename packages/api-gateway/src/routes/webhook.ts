import { Router, Request, Response } from 'express';
import axios from 'axios';
import { GosacWebhookPayload } from '@cm/shared';

export const webhookRouter = Router();

const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || 'http://localhost:3001';

webhookRouter.post('/gosac', async (req: Request, res: Response) => {
    try {
        const payload: GosacWebhookPayload = req.body;

        // Log do webhook recebido
        console.log(`📩 Webhook recebido - Tipo: ${payload.type}`);

        // Ignorar mensagens de grupo
        if (payload.data.fromGroup) {
            console.log('⏭️ Ignorando mensagem de grupo');
            return res.status(200).json({ status: 'ignored', reason: 'group_message' });
        }

        // Ignorar mensagens do próprio bot/atendente (fromMe = true)
        if (payload.data.fromMe) {
            console.log('⏭️ Ignorando mensagem própria (fromMe)');
            return res.status(200).json({ status: 'ignored', reason: 'from_me' });
        }

        // Verificar se o ticket está aberto
        if (payload.data.ticket?.status !== 'open') {
            console.log('⏭️ Ticket não está aberto');
            return res.status(200).json({ status: 'ignored', reason: 'ticket_not_open' });
        }

        // Verificar se tem atendente humano (userId indica atendente atribuído)
        // Se quiser que o bot só funcione quando NÃO tem atendente, descomente:
        // if (payload.data.ticket?.userId) {
        //   console.log('⏭️ Ticket tem atendente humano');
        //   return res.status(200).json({ status: 'ignored', reason: 'has_human_agent' });
        // }

        // Extrair dados importantes
        const mensagemData = {
            contactId: payload.data.contactId,
            ticketId: payload.data.ticketId,
            body: payload.data.body,
            mediaUrl: payload.data.mediaUrl,
            mediaType: payload.data.mediaType,
            contactName: payload.data.contact?.name || 'Cliente',
            contactNumber: payload.data.contact?.number || '',
            timestamp: payload.data.updatedAt
        };

        console.log(`💬 Mensagem de: ${mensagemData.contactName} (${mensagemData.contactId})`);
        console.log(`📝 Conteúdo: ${mensagemData.body?.substring(0, 50)}...`);

        // Enviar para o Chatbot Service processar
        const chatbotResponse = await axios.post(
            `${CHATBOT_SERVICE_URL}/process`,
            mensagemData,
            { timeout: 30000 }
        );

        console.log(`✅ Resposta do chatbot processada`);

        return res.status(200).json({
            status: 'processed',
            chatbotResponse: chatbotResponse.data
        });

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('❌ Erro ao chamar chatbot service:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('⚠️ Chatbot service não está rodando!');
            }
        } else {
            console.error('❌ Erro no webhook:', error);
        }

        // Retornar 200 para o Gosac não reenviar
        return res.status(200).json({
            status: 'error',
            message: 'Erro interno, mas webhook recebido'
        });
    }
});
