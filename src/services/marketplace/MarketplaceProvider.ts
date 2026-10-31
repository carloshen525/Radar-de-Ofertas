// Interface Base Abstrata para Provedores de Marketplace

import { Product, RadarFilterConfig } from '@/lib/types';

export interface SearchOffersResult {
  products: Omit<Product, 'id' | 'status' | 'created_at'>[];
  totalFound: number;
  hasNextPage: boolean;
}

export interface MarketplaceProvider {
  readonly marketplaceName: string;

  /**
   * Testa a autenticação e conectividade com a API oficial do marketplace
   */
  testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Busca ofertas e produtos aplicando os filtros do radar
   */
  searchOffers(config: RadarFilterConfig): Promise<SearchOffersResult>;

  /**
   * Gera um link curto de afiliado oficial para um produto específico
   */
  generateAffiliateLink(originUrl: string, subIds?: string[]): Promise<string>;

  /**
   * Consulta os detalhes atualizados de um produto
   */
  getProductDetails(itemId: string): Promise<Partial<Product> | null>;
}

