// Tipos do Webhook do Gosac
export interface GosacContact {
    id: number;
    name: string;
    number: string;
    email: string;
    profilePicUrl: string;
    isGroup: boolean;
    hasWhatsapp: boolean;
}

export interface GosacTicket {
    id: number;
    status: 'open' | 'closed' | 'pending';
    userId: number | null;
    contactId: number;
    lastMessage: string;
    lastMessageAt: string;
    contact: GosacContact;
}

export interface GosacWebhookData {
    mediaUrl: string | null;
    id: string;
    fromMe: boolean;
    body: string;
    mediaType: string;
    updatedAt: string;
    ticketId: number;
    contactId: number;
    fromGroup: boolean;
    contact: GosacContact;
    ticket: GosacTicket;
}

export interface GosacWebhookPayload {
    data: GosacWebhookData;
    type: string;
}

// Tipos das Etapas
export interface Requisitos {
    campos_obrigatorios?: string[];
    validacoes?: Record<string, string>;
    aceita_arquivos?: boolean;
    tipos_arquivo?: string[];
    proximo_etapa_condicao?: Record<string, number>;
}

export interface Etapa {
    id: number;
    nome: string;
    descricao: string | null;
    ordem: number;
    prompt_sistema: string;
    requisitos: Requisitos;
    criada_em: Date;
    atualizada_em: Date;
}

// Tipos do Estado do Cliente
export interface DadosColetados {
    nome_completo?: string;
    telefone?: string;
    quer_agendar_visita?: boolean;
    data_visita?: string;
    observacoes?: string;
    [key: string]: unknown;
}

export interface MensagemHistorico {
    papel: 'cliente' | 'assistente';
    conteudo: string;
    timestamp: string;
    mediaUrl?: string;
    mediaType?: string;
}

export interface EstadoCliente {
    id: number;
    contact_id: number;
    ticket_id: number;
    etapa_id: number;
    dados_coletados: DadosColetados;
    historico_mensagens: MensagemHistorico[];
    ultima_mensagem_ia: Date | null;
    ultima_mensagem_cliente: Date | null;
    timeout_verificado: boolean;
    uuid_verificacao: string | null;
    criada_em: Date;
    atualizada_em: Date;
    finalizada_em: Date | null;
}

// Tipos dos Arquivos
export interface Arquivo {
    id: number;
    estado_cliente_id: number;
    contact_id: number;
    url_original: string | null;
    tipo_midia: string | null;
    caminho_google_drive: string | null;
    criada_em: Date;
}

// Tipos para respostas da IA
export interface RespostaIA {
    mensagem: string;
    avancar_etapa: boolean;
    dados_extraidos: DadosColetados;
    finalizar_atendimento: boolean;
    enviar_para_humano: boolean;
}

// Tipos para o Scheduler
export interface TimeoutJob {
    estado_cliente_id: number;
    contact_id: number;
    ticket_id: number;
    uuid_verificacao: string;
    etapa_atual: string;
    contexto_resumido: string;
}
