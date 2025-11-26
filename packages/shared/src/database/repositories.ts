import { query, queryOne, execute } from './connection';
import { Etapa, EstadoCliente, Arquivo, DadosColetados, MensagemHistorico } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ==================== ETAPAS ====================

export async function getEtapas(): Promise<Etapa[]> {
    return query<Etapa>('SELECT * FROM etapas ORDER BY ordem ASC');
}

export async function getEtapaById(id: number): Promise<Etapa | null> {
    return queryOne<Etapa>('SELECT * FROM etapas WHERE id = $1', [id]);
}

export async function getEtapaByOrdem(ordem: number): Promise<Etapa | null> {
    return queryOne<Etapa>('SELECT * FROM etapas WHERE ordem = $1', [ordem]);
}

export async function getProximaEtapa(ordemAtual: number): Promise<Etapa | null> {
    return queryOne<Etapa>(
        'SELECT * FROM etapas WHERE ordem > $1 ORDER BY ordem ASC LIMIT 1',
        [ordemAtual]
    );
}

// ==================== ESTADO CLIENTE ====================

export async function getEstadoCliente(contactId: number, ticketId: number): Promise<EstadoCliente | null> {
    return queryOne<EstadoCliente>(
        `SELECT * FROM estado_cliente 
     WHERE contact_id = $1 AND ticket_id = $2 AND finalizada_em IS NULL
     ORDER BY criada_em DESC LIMIT 1`,
        [contactId, ticketId]
    );
}

export async function getEstadoClienteById(id: number): Promise<EstadoCliente | null> {
    return queryOne<EstadoCliente>('SELECT * FROM estado_cliente WHERE id = $1', [id]);
}

export async function getEstadoClienteByUuid(uuid: string): Promise<EstadoCliente | null> {
    return queryOne<EstadoCliente>(
        'SELECT * FROM estado_cliente WHERE uuid_verificacao = $1',
        [uuid]
    );
}

export async function criarEstadoCliente(
    contactId: number,
    ticketId: number,
    etapaId: number
): Promise<EstadoCliente> {
    const uuid = uuidv4();
    const rows = await query<EstadoCliente>(
        `INSERT INTO estado_cliente (contact_id, ticket_id, etapa_id, uuid_verificacao)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [contactId, ticketId, etapaId, uuid]
    );
    return rows[0];
}

export async function atualizarEstadoCliente(
    id: number,
    updates: {
        etapa_id?: number;
        dados_coletados?: DadosColetados;
        historico_mensagens?: MensagemHistorico[];
        ultima_mensagem_ia?: Date;
        ultima_mensagem_cliente?: Date;
        timeout_verificado?: boolean;
        uuid_verificacao?: string;
        finalizada_em?: Date;
    }
): Promise<EstadoCliente | null> {
    const setClauses: string[] = ['atualizada_em = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.etapa_id !== undefined) {
        setClauses.push(`etapa_id = $${paramIndex++}`);
        values.push(updates.etapa_id);
    }
    if (updates.dados_coletados !== undefined) {
        setClauses.push(`dados_coletados = $${paramIndex++}`);
        values.push(JSON.stringify(updates.dados_coletados));
    }
    if (updates.historico_mensagens !== undefined) {
        setClauses.push(`historico_mensagens = $${paramIndex++}`);
        values.push(JSON.stringify(updates.historico_mensagens));
    }
    if (updates.ultima_mensagem_ia !== undefined) {
        setClauses.push(`ultima_mensagem_ia = $${paramIndex++}`);
        values.push(updates.ultima_mensagem_ia);
    }
    if (updates.ultima_mensagem_cliente !== undefined) {
        setClauses.push(`ultima_mensagem_cliente = $${paramIndex++}`);
        values.push(updates.ultima_mensagem_cliente);
    }
    if (updates.timeout_verificado !== undefined) {
        setClauses.push(`timeout_verificado = $${paramIndex++}`);
        values.push(updates.timeout_verificado);
    }
    if (updates.uuid_verificacao !== undefined) {
        setClauses.push(`uuid_verificacao = $${paramIndex++}`);
        values.push(updates.uuid_verificacao);
    }
    if (updates.finalizada_em !== undefined) {
        setClauses.push(`finalizada_em = $${paramIndex++}`);
        values.push(updates.finalizada_em);
    }

    values.push(id);

    return queryOne<EstadoCliente>(
        `UPDATE estado_cliente SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
}

export async function renovarUuidVerificacao(id: number): Promise<string> {
    const novoUuid = uuidv4();
    await execute(
        `UPDATE estado_cliente SET uuid_verificacao = $1, timeout_verificado = false, atualizada_em = CURRENT_TIMESTAMP WHERE id = $2`,
        [novoUuid, id]
    );
    return novoUuid;
}

export async function finalizarAtendimento(id: number): Promise<void> {
    await execute(
        `UPDATE estado_cliente SET finalizada_em = CURRENT_TIMESTAMP, atualizada_em = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
    );
}

export async function marcarTimeoutVerificado(id: number): Promise<void> {
    await execute(
        `UPDATE estado_cliente SET timeout_verificado = true, atualizada_em = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
    );
}

// ==================== ARQUIVOS ====================

export async function salvarArquivo(
    estadoClienteId: number,
    contactId: number,
    urlOriginal: string | null,
    tipoMidia: string | null,
    caminhoGoogleDrive: string | null
): Promise<Arquivo> {
    const rows = await query<Arquivo>(
        `INSERT INTO arquivos (estado_cliente_id, contact_id, url_original, tipo_midia, caminho_google_drive)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [estadoClienteId, contactId, urlOriginal, tipoMidia, caminhoGoogleDrive]
    );
    return rows[0];
}

export async function getArquivosDoEstado(estadoClienteId: number): Promise<Arquivo[]> {
    return query<Arquivo>(
        'SELECT * FROM arquivos WHERE estado_cliente_id = $1 ORDER BY criada_em ASC',
        [estadoClienteId]
    );
}

// ==================== HISTÓRICO ====================

export async function adicionarMensagemHistorico(
    estadoId: number,
    mensagem: MensagemHistorico
): Promise<void> {
    await execute(
        `UPDATE estado_cliente 
     SET historico_mensagens = historico_mensagens || $1::jsonb,
         atualizada_em = CURRENT_TIMESTAMP
     WHERE id = $2`,
        [JSON.stringify([mensagem]), estadoId]
    );
}
