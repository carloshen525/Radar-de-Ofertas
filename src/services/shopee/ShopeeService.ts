// Serviço de Integração com Shopee para a Automação Serverless

import { ShopeeProvider } from '@/services/marketplace/ShopeeProvider';
import { fileStorage } from '@/lib/storage';
import { isRoupaFeminina } from '@/lib/filters';

export interface ProdutoShopee {
  produto_id: string;
  titulo: string;
  descricao?: string;
  preco: number;
  preco_original?: number;
  link_afiliado: string;
  imagem: string;
  categoria: string;
  loja: string;
  desconto: number;
  avaliacao: number;
  vendas: number;
}

export class ShopeeService {
  private provider: ShopeeProvider;

  constructor(appId?: string, secretKey?: string) {
    const config = fileStorage.getShopeeConfig();
    const activeAppId = appId || process.env.SHOPEE_APP_ID || config.appId;
    const activeSecret = secretKey || process.env.SHOPEE_SECRET || config.secretKey;
    this.provider = new ShopeeProvider(activeAppId, activeSecret);
  }

  /**
   * Busca ofertas na Shopee com paginação e mapeamento para o padrão de banco
   */
  async buscarOfertas(page: number = 1, limit: number = 30, categoria: string = 'Geral'): Promise<ProdutoShopee[]> {
    const result = await this.provider.searchOffers({
      categoria,
      pagina: page,
      limitePorBusca: limit,
      descontoMinimo: 10,
      avaliacaoMinima: 3.8,
      vendasMinimas: 5,
      precoMinimo: 0,
      precoMaximo: 2000,
    });

    return (result.products || [])
      .filter((p) => !isRoupaFeminina(p.nome, p.categoria))
      .map((p) => {
      let precoAntigo = p.preco_antigo;
      if (!precoAntigo && p.desconto > 0) {
        precoAntigo = parseFloat((p.preco / (1 - p.desconto / 100)).toFixed(2));
      }

      return {
        produto_id: String(p.external_item_id),
        titulo: p.nome,
        descricao: `${p.categoria} - Oferta Shopee com ${p.desconto}% OFF`,
        preco: p.preco,
        preco_original: precoAntigo || p.preco,
        link_afiliado: p.url_afiliado || p.url_original,
        imagem: p.imagem,
        categoria: p.categoria || categoria,
        loja: p.loja || 'Loja Parceira Shopee',
        desconto: p.desconto || 0,
        avaliacao: p.avaliacao || 4.5,
        vendas: p.vendas || 0,
      };
    });
  }
}

export const defaultShopeeService = new ShopeeService();

