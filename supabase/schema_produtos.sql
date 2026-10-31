-- Tabela de Produtos para o Radar Shopee (Serverless / N8N / Vercel)
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  preco_original NUMERIC(10, 2),
  link_afiliado TEXT NOT NULL,
  imagem TEXT,
  categoria TEXT,
  loja TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  publicado BOOLEAN DEFAULT FALSE,
  data_publicacao TIMESTAMPTZ
);

-- Índices para performance de busca e integridade
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_produto_id ON produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_publicado ON produtos(publicado);
CREATE INDEX IF NOT EXISTS idx_produtos_criado_em ON produtos(criado_em);
CREATE INDEX IF NOT EXISTS idx_produtos_data_publicacao ON produtos(data_publicacao);

-- Regra de Anti-Duplicidade de 2 semanas (14 dias):
-- Um produto só pode ser re-publicado se:
-- 1) Nunca foi publicado (publicado = FALSE ou data_publicacao IS NULL)
-- 2) Ou se data_publicacao < NOW() - INTERVAL '14 days'
CREATE OR REPLACE VIEW view_produtos_elegiveis AS
SELECT * FROM produtos
WHERE publicado = FALSE
   OR data_publicacao IS NULL
   OR data_publicacao < (NOW() - INTERVAL '14 days')
ORDER BY
   CASE WHEN publicado = FALSE OR data_publicacao IS NULL THEN 0 ELSE 1 END,
   COALESCE(data_publicacao, criado_em) ASC;

-- Políticas RLS (Row Level Security) opcionais
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para chaves autenticadas / service role
CREATE POLICY "Permitir acesso completo para Service Role e Anon" ON produtos
  FOR ALL
  USING (true)
  WITH CHECK (true);

