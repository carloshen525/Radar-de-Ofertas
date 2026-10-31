// Definições de Tipos TypeScript - Radar Shopee SaaS

export type MarketplaceType = 'shopee' | 'mercadolivre' | 'amazon' | 'aliexpress';

export type ProductStatus = 
  | 'encontrado' 
  | 'analisando' 
  | 'aprovado' 
  | 'agendado' 
  | 'publicado' 
  | 'rejeitado';

export interface Product {
  id: string;
  marketplace: MarketplaceType;
  external_item_id: string;
  nome: string;
  imagem: string;
  preco: number;
  preco_antigo?: number;
  desconto: number;
  avaliacao: number;
  vendas: number;
  categoria: string;
  loja?: string;
  url_original: string;
  url_afiliado?: string;
  status: ProductStatus;
  score: number;
  legenda_ia?: string;
  motivo_rejeicao?: string;
  created_at: string;
  updated_at?: string;
}

export interface RadarFilterConfig {
  categoria: string;
  palavrasChave?: string;
  descontoMinimo: number;
  avaliacaoMinima: number;
  vendasMinimas: number;
  precoMinimo: number;
  precoMaximo: number;
  limitePorBusca: number;
}

export interface TelegramChannel {
  id: string;
  nome: string;
  chat_id: string;
  tipo: 'canal' | 'grupo' | 'admin';
  ativo: boolean;
  total_enviados: number;
  ultimo_envio_em?: string;
  created_at: string;
}

export interface Publication {
  id: string;
  product_id: string;
  telegram_channel: string;
  telegram_message_id?: number;
  legenda_enviada?: string;
  status: 'publicado' | 'erro' | 'agendado';
  mensagem_erro?: string;
  published_at: string;
  product?: Product;
}

export interface ShopeeAccountConfig {
  appId: string;
  secretKey: string;
  accessToken?: string;
  status?: string;
  ultimoTesteEm?: string;
  mensagemStatus?: string;
}

export interface AutomationSettings {
  id?: string;
  ativo: boolean;
  quantidade_diaria: number;
  intervalo_minutos: number;
  horarios_disparo: string[];
  auto_aprovar_score_minimo: number;
  auto_gerar_copys_ia: boolean;
  auto_publicar: boolean;
  updated_at?: string;
}

export interface SystemLog {
  id: string;
  modulo: 'shopee' | 'telegram' | 'ia' | 'automacao' | 'sistema';
  evento: string;
  status: 'sucesso' | 'alerta' | 'erro';
  mensagem: string;
  detalhes?: any;
  created_at: string;
}

export interface DashboardStats {
  produtosEncontradosHoje: number;
  produtosAprovados: number;
  produtosPublicadosHoje: number;
  totalPublicacoes: number;
  ultimaSincronizacaoShopee?: string;
  statusTelegram: 'conectado' | 'desconectado' | 'erro';
  statusShopeeApi: 'ativo' | 'inativo' | 'erro';
  totalErrosHoje: number;
}

