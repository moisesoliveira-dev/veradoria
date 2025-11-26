import { Router, Request, Response } from 'express';
import { ChatbotController } from '../controllers/chatbot.controller';

export const processRouter = Router();
const chatbotController = new ChatbotController();

export interface ProcessMessageRequest {
    contactId: number;
    ticketId: number;
    body: string;
    mediaUrl: string | null;
    mediaType: string;
    contactName: string;
    contactNumber: string;
    timestamp: string;
}

processRouter.post('/', async (req: Request<{}, {}, ProcessMessageRequest>, res: Response) => {
    try {
        const mensagem = req.body;

        console.log(`🔄 Processando mensagem do contato ${mensagem.contactId}`);

        const resultado = await chatbotController.processarMensagem(mensagem);

        return res.json(resultado);

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao processar mensagem'
        });
    }
});
