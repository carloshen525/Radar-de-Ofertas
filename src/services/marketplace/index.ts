import { MarketplaceProvider } from './MarketplaceProvider';
import { ShopeeProvider } from './ShopeeProvider';
import { MercadoLivreProvider } from './MercadoLivreProvider';
import { AmazonProvider } from './AmazonProvider';
import { MarketplaceType } from '@/lib/types';

export function getMarketplaceProvider(
  marketplace: MarketplaceType = 'shopee',
  credentials?: { appId?: string; secretKey?: string }
): MarketplaceProvider {
  switch (marketplace) {
    case 'shopee':
      return new ShopeeProvider(credentials?.appId, credentials?.secretKey);
    case 'mercadolivre':
      return new MercadoLivreProvider();
    case 'amazon':
      return new AmazonProvider();
    default:
      return new ShopeeProvider();
  }
}

export * from './MarketplaceProvider';
export * from './ShopeeProvider';
export * from './MercadoLivreProvider';
export * from './AmazonProvider';

