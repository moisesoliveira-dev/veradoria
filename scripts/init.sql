-- Tabela de etapas do atendimento
CREATE TABLE IF NOT EXISTS etapas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL,
  prompt_sistema TEXT NOT NULL,
  requisitos JSONB DEFAULT '{}',
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de estado do cliente (uma conversa por ticket)
CREATE TABLE IF NOT EXISTS estado_cliente (
  id SERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL,
  ticket_id BIGINT NOT NULL,
  etapa_id INT NOT NULL REFERENCES etapas(id),
  dados_coletados JSONB DEFAULT '{}',
  historico_mensagens JSONB DEFAULT '[]',
  ultima_mensagem_ia TIMESTAMP,
  ultima_mensagem_cliente TIMESTAMP,
  timeout_verificado BOOLEAN DEFAULT FALSE,
  uuid_verificacao UUID,
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalizada_em TIMESTAMP
);

-- Tabela de arquivos/imagens enviadas
CREATE TABLE IF NOT EXISTS arquivos (
  id SERIAL PRIMARY KEY,
  estado_cliente_id INT NOT NULL REFERENCES estado_cliente(id),
  contact_id BIGINT NOT NULL,
  url_original VARCHAR(500),
  tipo_midia VARCHAR(50),
  caminho_google_drive VARCHAR(500),
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_estado_cliente_contact_ticket 
  ON estado_cliente(contact_id, ticket_id);

CREATE INDEX IF NOT EXISTS idx_estado_cliente_uuid 
  ON estado_cliente(uuid_verificacao);

CREATE INDEX IF NOT EXISTS idx_arquivos_estado 
  ON arquivos(estado_cliente_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizada_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_etapas_updated_at ON etapas;
CREATE TRIGGER update_etapas_updated_at 
  BEFORE UPDATE ON etapas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estado_cliente_updated_at ON estado_cliente;
CREATE TRIGGER update_estado_cliente_updated_at 
  BEFORE UPDATE ON estado_cliente 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
