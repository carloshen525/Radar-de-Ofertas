-- ==============================================================================
-- RADAR SHOPEE - SCHEMA SAAS MULTI-USUÁRIO COMPLETO
-- PostgreSQL para Supabase
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: users (Perfis de Usuários do SaaS)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'admin', -- 'admin', 'user'
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA: shopee_accounts (Credenciais e Configurações da API Oficial Shopee)
CREATE TABLE IF NOT EXISTS shopee_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nome_identificador VARCHAR(100) DEFAULT 'Conta Principal Shopee',
    app_id VARCHAR(255) NOT NULL,
    secret_key TEXT NOT NULL,
    access_token TEXT,
    status VARCHAR(50) DEFAULT 'ativo', -- 'ativo', 'invalido', 'pausado'
    ultimo_teste_em TIMESTAMPTZ,
    mensagem_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: products (Produtos Minerados e Catálogo Central)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace VARCHAR(50) DEFAULT 'shopee', -- 'shopee', 'mercadolivre', 'amazon', 'aliexpress'
    external_item_id VARCHAR(100) NOT NULL,
    nome TEXT NOT NULL,
    imagem TEXT NOT NULL,
    preco NUMERIC(10,2) NOT NULL,
    preco_antigo NUMERIC(10,2),
    desconto NUMERIC(5,2) DEFAULT 0.00,
    avaliacao NUMERIC(3,2) DEFAULT 0.00,
    vendas INTEGER DEFAULT 0,
    categoria VARCHAR(100) NOT NULL,
    loja VARCHAR(255),
    url_original TEXT NOT NULL,
    url_afiliado TEXT,
    status VARCHAR(50) DEFAULT 'encontrado', -- 'encontrado', 'analisando', 'aprovado', 'agendado', 'publicado', 'rejeitado'
    score NUMERIC(5,2) DEFAULT 0.00,
    legenda_ia TEXT,
    motivo_rejeicao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_marketplace_item UNIQUE (marketplace, external_item_id)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_score ON products(score DESC);
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);

-- 4. TABELA: product_searches (Histórico e Parâmetros de Buscas do Radar)
CREATE TABLE IF NOT EXISTS product_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    termo_busca VARCHAR(255),
    categoria VARCHAR(100),
    desconto_minimo NUMERIC(5,2) DEFAULT 30.00,
    avaliacao_minima NUMERIC(3,2) DEFAULT 4.50,
    vendas_minimas INTEGER DEFAULT 100,
    preco_minimo NUMERIC(10,2) DEFAULT 0.00,
    preco_maximo NUMERIC(10,2) DEFAULT 2000.00,
    total_encontrados INTEGER DEFAULT 0,
    total_aprovados INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'concluido', -- 'executando', 'concluido', 'falha'
    executado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: affiliate_links (Rastreamento e Encurtamento de Links Afiliados)
CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace VARCHAR(50) DEFAULT 'shopee',
    url_original TEXT NOT NULL,
    url_afiliado TEXT NOT NULL,
    sub_id VARCHAR(100) DEFAULT 'telegram',
    total_cliques INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: offer_queue (Fila / Esteira de Ofertas Kanban)
CREATE TABLE IF NOT EXISTS offer_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    posicao INTEGER DEFAULT 0,
    agendado_para TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'agendado', -- 'agendado', 'processando', 'concluido', 'cancelado'
    prioridade INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_queue_agendado ON offer_queue(agendado_para ASC);

-- 7. TABELA: telegram_channels (Canais e Grupos de Destino no Telegram)
CREATE TABLE IF NOT EXISTS telegram_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    chat_id VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(50) DEFAULT 'canal', -- 'canal', 'grupo', 'admin'
    ativo BOOLEAN DEFAULT TRUE,
    total_enviados INTEGER DEFAULT 0,
    ultimo_envio_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA: publications (Histórico de Postagens Realizadas)
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    telegram_channel VARCHAR(100) NOT NULL,
    telegram_message_id BIGINT,
    legenda_enviada TEXT,
    status VARCHAR(50) DEFAULT 'publicado', -- 'publicado', 'erro', 'agendado'
    mensagem_erro TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_channel_publication UNIQUE (product_id, telegram_channel)
);

CREATE INDEX IF NOT EXISTS idx_publications_channel ON publications(telegram_channel);
CREATE INDEX IF NOT EXISTS idx_publications_date ON publications(published_at DESC);

-- 9. TABELA: automation_settings (Configuração dos Motores de Automação)
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    quantidade_diaria INTEGER DEFAULT 20,
    intervalo_minutos INTEGER DEFAULT 30,
    horarios_disparo TEXT[] DEFAULT ARRAY['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    auto_aprovar_score_minimo NUMERIC(5,2) DEFAULT 75.00,
    auto_gerar_copys_ia BOOLEAN DEFAULT TRUE,
    auto_publicar BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA: system_logs (Central de Auditoria de Todos os Módulos)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo VARCHAR(50) NOT NULL, -- 'shopee', 'telegram', 'ia', 'automacao', 'sistema'
    evento VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'sucesso', 'alerta', 'erro'
    mensagem TEXT,
    detalhes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_modulo ON system_logs(modulo);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at DESC);

-- TRIGGER PARA TIMESTAMP
CREATE OR REPLACE FUNCTION trigger_set_timestamp_saas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_timestamp_products ON products;
CREATE TRIGGER trg_set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_saas();

DROP TRIGGER IF EXISTS trg_set_timestamp_automation ON automation_settings;
CREATE TRIGGER trg_set_timestamp_automation
BEFORE UPDATE ON automation_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_saas();

-- SEEDS INICIAIS
INSERT INTO automation_settings (ativo, quantidade_diaria, intervalo_minutos)
VALUES (true, 24, 30)
ON CONFLICT DO NOTHING;

INSERT INTO telegram_channels (nome, chat_id, tipo, ativo)
VALUES 
  ('Canal Principal de Ofertas', '@canal_achadinhos_demo', 'canal', true),
  ('Grupo VIP de Cupons', '-1001234567890', 'grupo', true)
ON CONFLICT (chat_id) DO NOTHING;

