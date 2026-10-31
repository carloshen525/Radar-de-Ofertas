// Provedor Preparado para Futura Integração com Mercado Livre Afiliados

import { MarketplaceProvider, SearchOffersResult } from './MarketplaceProvider';
import { Product, RadarFilterConfig } from '@/lib/types';

export class MercadoLivreProvider implements MarketplaceProvider {
  readonly marketplaceName = 'mercadolivre';

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Módulo Mercado Livre preparado e pronto para receber credenciais da API.',
    };
  }

  async searchOffers(config: RadarFilterConfig): Promise<SearchOffersResult> {
    // Camada preparada para chamar a API de Deals / Afiliados do Mercado Livre
    return {
      products: [],
      totalFound: 0,
      hasNextPage: false,
    };
  }

  async generateAffiliateLink(originUrl: string, subIds: string[] = []): Promise<string> {
    return originUrl;
  }

  async getProductDetails(itemId: string): Promise<Partial<Product> | null> {
    return null;
  }
}

