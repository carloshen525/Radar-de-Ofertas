-- Script para criar a tabela de Canais e Grupos do Telegram no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/hexzmqjuuevsqlvguzed/sql

CREATE TABLE IF NOT EXISTS telegram_channels (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  chat_id TEXT UNIQUE NOT NULL,
  tipo TEXT DEFAULT 'canal',
  ativo BOOLEAN DEFAULT TRUE,
  total_enviados INTEGER DEFAULT 0,
  ultimo_envio_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Segurança de Linha)
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;

-- Política para leitura e gravação
CREATE POLICY "Permitir acesso completo a telegram_channels" ON telegram_channels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir o primeiro canal se não existir
INSERT INTO telegram_channels (id, nome, chat_id, tipo, ativo)
VALUES ('chan-1', 'Radar Shopee Oficial', '@radarsshopee', 'canal', true)
ON CONFLICT (chat_id) DO NOTHING;
