// Provedor Preparado para Futura Integração com Amazon Associates API (PA-API v5)

import { MarketplaceProvider, SearchOffersResult } from './MarketplaceProvider';
import { Product, RadarFilterConfig } from '@/lib/types';

export class AmazonProvider implements MarketplaceProvider {
  readonly marketplaceName = 'amazon';

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Módulo Amazon Associates preparado e pronto para receber credenciais PA-API.',
    };
  }

  async searchOffers(config: RadarFilterConfig): Promise<SearchOffersResult> {
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

