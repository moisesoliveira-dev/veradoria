import axios from 'axios';

export class GosacService {
    private baseUrl: string;
    private token: string;

    constructor() {
        this.baseUrl = process.env.GOSAC_BASE_URL || '';
        this.token = process.env.GOSAC_TOKEN || '';

        if (!this.baseUrl || !this.token) {
            console.warn('⚠️ GOSAC_BASE_URL ou GOSAC_TOKEN não configurados');
        }
    }

    async enviarMensagem(ticketId: number, mensagem: string): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/api/messages/${ticketId}`;

            const response = await axios.post(
                url,
                { body: mensagem },
                {
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(`✅ Mensagem enviada para Gosac - Ticket ${ticketId}`);
            return true;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('❌ Erro ao enviar mensagem para Gosac:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
            } else {
                console.error('❌ Erro desconhecido ao enviar mensagem:', error);
            }
            return false;
        }
    }

    async enviarMensagemComImagem(
        ticketId: number,
        mensagem: string,
        imageUrl: string
    ): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/api/messages/${ticketId}`;

            const response = await axios.post(
                url,
                {
                    body: mensagem,
                    mediaUrl: imageUrl,
                    mediaType: 'image'
                },
                {
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(`✅ Mensagem com imagem enviada para Gosac - Ticket ${ticketId}`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem com imagem:', error);
            return false;
        }
    }
}
