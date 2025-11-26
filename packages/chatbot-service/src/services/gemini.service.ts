import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import { MensagemHistorico, RespostaIA, DadosColetados } from '@cm/shared';

export class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ GEMINI_API_KEY não configurada - respostas de fallback serão usadas');
            return;
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 500,
            }
        });
        console.log('✅ Gemini Service inicializado');
    }

    async gerarResposta(
        promptSistema: string,
        historico: MensagemHistorico[],
        mensagemAtual: string
    ): Promise<RespostaIA> {
        // Se não tem model configurado, retornar fallback
        if (!this.model) {
            console.warn('⚠️ Gemini não disponível - usando resposta de fallback');
            return {
                mensagem: 'Olá! Obrigada pelo contato com a CM Modulados! 💜 Em breve um atendente irá te ajudar.',
                avancar_etapa: false,
                dados_extraidos: {},
                finalizar_atendimento: false,
                enviar_para_humano: true
            };
        }

        try {
            // Construir histórico de conversa
            const historicoFormatado = historico.slice(-10).map(msg => ({
                role: msg.papel === 'cliente' ? 'user' : 'model',
                parts: [{ text: msg.conteudo }]
            })) as Content[];

            // Prompt com instruções de resposta estruturada
            const promptCompleto = `${promptSistema}

INSTRUÇÕES DE RESPOSTA:
Você deve responder APENAS com um JSON válido no seguinte formato:
{
  "mensagem": "sua resposta humanizada aqui",
  "avancar_etapa": true/false,
  "dados_extraidos": { "campo": "valor" },
  "finalizar_atendimento": true/false,
  "enviar_para_humano": true/false
}

REGRAS DO JSON:
- "mensagem": texto da resposta para o cliente (humanizada, com emojis moderados)
- "avancar_etapa": true apenas se TODOS os requisitos da etapa foram cumpridos
- "dados_extraidos": extraia informações mencionadas (nome_completo, ambiente_interesse, quer_agendar_visita, etc)
- "finalizar_atendimento": true apenas na etapa de finalização quando tudo estiver completo
- "enviar_para_humano": true se o cliente pedir para falar com humano ou assunto muito complexo

Mensagem atual do cliente: "${mensagemAtual}"

Responda APENAS com o JSON, sem markdown ou explicações.`;

            // Iniciar chat com histórico
            const chat = this.model.startChat({
                history: historicoFormatado,
            });

            const result = await chat.sendMessage(promptCompleto);
            const respostaTexto = result.response.text();

            // Tentar parsear JSON
            try {
                // Limpar resposta (remover markdown se houver)
                let jsonLimpo = respostaTexto
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();

                const resposta: RespostaIA = JSON.parse(jsonLimpo);

                return {
                    mensagem: resposta.mensagem || 'Desculpe, não entendi. Pode repetir?',
                    avancar_etapa: resposta.avancar_etapa || false,
                    dados_extraidos: resposta.dados_extraidos || {},
                    finalizar_atendimento: resposta.finalizar_atendimento || false,
                    enviar_para_humano: resposta.enviar_para_humano || false
                };

            } catch (parseError) {
                console.error('Erro ao parsear resposta do Gemini:', parseError);
                console.log('Resposta bruta:', respostaTexto);

                // Fallback: usar texto bruto como mensagem
                return {
                    mensagem: respostaTexto.substring(0, 500),
                    avancar_etapa: false,
                    dados_extraidos: {},
                    finalizar_atendimento: false,
                    enviar_para_humano: false
                };
            }

        } catch (error) {
            console.error('Erro ao chamar Gemini:', error);

            // Resposta de fallback
            return {
                mensagem: 'Desculpe, estou com uma dificuldade técnica. Em instantes retorno! 😊',
                avancar_etapa: false,
                dados_extraidos: {},
                finalizar_atendimento: false,
                enviar_para_humano: true
            };
        }
    }
}
