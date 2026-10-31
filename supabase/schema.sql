-- ==============================================================================
-- PROJETO: RADAR SHOPEE - SISTEMA AUTOMATIZADO DE OFERTAS AFILIADAS
-- BANCO DE DADOS: Supabase PostgreSQL
-- ==============================================================================

-- Habilita extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABELA: settings (Configurações do Robô por Categoria ou Globais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria VARCHAR(100) NOT NULL UNIQUE,
    desconto_minimo NUMERIC(5,2) DEFAULT 30.00,       -- Ex: 30%
    avaliacao_minima NUMERIC(3,2) DEFAULT 4.50,       -- Ex: 4.5 estrelas
    vendas_minimas INTEGER DEFAULT 100,               -- Ex: 100 vendas
    preco_maximo NUMERIC(10,2) DEFAULT 1000.00,       -- Preço teto para filtrar
    quantidade_diaria INTEGER DEFAULT 20,             -- Limite diário por categoria
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABELA: products (Produtos minerados da Shopee)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopee_item_id VARCHAR(100) UNIQUE NOT NULL,      -- ID único do item na Shopee
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
    status VARCHAR(50) DEFAULT 'encontrado',          -- encontrado, analisado, aprovado, rejeitado, publicado
    score NUMERIC(5,2) DEFAULT 0.00,                  -- Pontuação ponderada de oportunidade
    legenda_ia TEXT,                                  -- Copy gerada pelo workflow de IA
    motivo_rejeicao TEXT,                             -- Caso rejeitado pelos filtros
    marketplace VARCHAR(50) DEFAULT 'shopee',         -- Permite expansão para Amazon, Magalu, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas e ordenações da fila de publicação
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_score ON products(score DESC);
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. TABELA: telegram_channels (Canais e Grupos de Destino)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telegram_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    chat_id VARCHAR(100) NOT NULL UNIQUE,             -- Ex: @meucanalshopee ou -100123456789
    tipo VARCHAR(50) DEFAULT 'canal',                 -- 'canal', 'grupo', 'admin'
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: publications (Registro de Postagens e Controle de Duplicidade)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    telegram_channel VARCHAR(100) NOT NULL,          -- Identificador do chat_id do canal
    telegram_message_id BIGINT,                      -- ID da mensagem retornada pelo Telegram
    status VARCHAR(50) DEFAULT 'publicado',          -- publicado, falha
    erro TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_channel UNIQUE (product_id, telegram_channel)
);

CREATE INDEX IF NOT EXISTS idx_publications_product ON publications(product_id);
CREATE INDEX IF NOT EXISTS idx_publications_date ON publications(published_at DESC);

-- ------------------------------------------------------------------------------
-- 5. TABELA: workflow_logs (Auditoria e Gerenciamento de Erros)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,                      -- sucesso, alerta, erro
    erro TEXT,
    detalhes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON workflow_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. TRIGGER PARA ATUALIZAR 'updated_at' AUTOMATICAMENTE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_products ON products;
CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_settings ON settings;
CREATE TRIGGER set_timestamp_settings
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ------------------------------------------------------------------------------
-- 7. VIEW: v_relatorio_diario (Consolidado para o Workflow 6 de Relatórios)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_relatorio_diario AS
SELECT
    CURRENT_DATE AS data_referencia,
    (SELECT COUNT(*) FROM products WHERE created_at::DATE = CURRENT_DATE) AS produtos_encontrados,
    (SELECT COUNT(*) FROM products WHERE status = 'aprovado' AND updated_at::DATE = CURRENT_DATE) AS produtos_aprovados,
    (SELECT COUNT(*) FROM publications WHERE published_at::DATE = CURRENT_DATE AND status = 'publicado') AS produtos_publicados,
    (SELECT COUNT(*) FROM workflow_logs WHERE created_at::DATE = CURRENT_DATE AND status = 'erro') AS total_erros;

-- ------------------------------------------------------------------------------
-- 8. SEEDS INICIAIS (Configurações padrão das categorias solicitadas)
-- ------------------------------------------------------------------------------
INSERT INTO settings (categoria, desconto_minimo, avaliacao_minima, vendas_minimas, preco_maximo, quantidade_diaria)
VALUES
    ('Eletrônicos', 25.00, 4.50, 100, 1500.00, 10),
    ('Casa', 30.00, 4.50, 50, 400.00, 10),
    ('Moda', 35.00, 4.60, 100, 250.00, 10),
    ('Beleza', 30.00, 4.60, 150, 200.00, 10),
    ('Games', 20.00, 4.50, 50, 2000.00, 10),
    ('Ferramentas', 25.00, 4.50, 50, 600.00, 10),
    ('Celulares', 20.00, 4.60, 100, 3000.00, 8)
ON CONFLICT (categoria) DO NOTHING;

-- Canal de exemplo para testes (atualizar com o seu chat_id real no Supabase)
INSERT INTO telegram_channels (nome, chat_id, tipo, ativo)
VALUES
    ('Canal Oficial Ofertas', '@radar_shopee_ofertas', 'canal', TRUE),
    ('Admin Alertas', 'SEU_CHAT_ID_ADMIN', 'admin', TRUE)
ON CONFLICT (chat_id) DO NOTHING;

