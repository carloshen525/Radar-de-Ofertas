// Provedor Oficial de Integração com Shopee Affiliate Open API (GraphQL)

import crypto from 'crypto';
import { MarketplaceProvider, SearchOffersResult } from './MarketplaceProvider';
import { Product, RadarFilterConfig } from '@/lib/types';
import { db } from '@/lib/db';
import { isRoupaFeminina } from '@/lib/filters';

export class ShopeeProvider implements MarketplaceProvider {
  readonly marketplaceName = 'shopee';
  private appId: string;
  private secretKey: string;
  private primaryUrl: string;
  private fallbackUrl: string;

  constructor(appId?: string, secretKey?: string) {
    this.appId = (appId || process.env.SHOPEE_APP_ID || '').trim();
    this.secretKey = (secretKey || process.env.SHOPEE_SECRET || '').trim();
    this.primaryUrl = process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql';
    this.fallbackUrl = 'https://open-api.affiliate.shopee.com/graphql';
  }

  /**
   * Gera o cabeçalho de assinatura criptográfica SHA256 oficial da Shopee Affiliate API
   */
  private generateAuthHeader(payload: string): { Authorization: string; 'Content-Type': string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const factor = `${this.appId}${timestamp}${payload}${this.secretKey}`;
    const signature = crypto.createHash('sha256').update(factor).digest('hex');

    return {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`,
    };
  }

  /**
   * Executa uma chamada GraphQL na API oficial da Shopee (tenta o endpoint BR e se falhar tenta o Global)
   */
  private async executeGraphQL(query: string): Promise<any> {
    if (!this.appId || !this.secretKey) {
      throw new Error(
        'Credenciais da Shopee não configuradas. Acesse a página "Configuração Shopee" e insira seu App ID e Secret Key.'
      );
    }

    const payload = JSON.stringify({ query });
    const headers = this.generateAuthHeader(payload);

    // Tenta primeiro no endpoint principal (Brasil)
    let response: Response;
    let endpointUsado = this.primaryUrl;

    try {
      response = await fetch(this.primaryUrl, {
        method: 'POST',
        headers,
        body: payload,
      });

      if (!response.ok && response.status >= 500) {
        throw new Error(`Status ${response.status}`);
      }
    } catch (primaryErr: any) {
      // Se falhar a conexão com o endpoint BR, tenta o endpoint Global
      endpointUsado = this.fallbackUrl;
      const fallbackHeaders = this.generateAuthHeader(payload);
      response = await fetch(this.fallbackUrl, {
        method: 'POST',
        headers: fallbackHeaders,
        body: payload,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopee API (${endpointUsado}) HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      const msg = data.errors.map((e: any) => e.message).join(' | ');
      throw new Error(`Shopee GraphQL Erro: ${msg}`);
    }

    return data.data;
  }

  /**
   * Valida conexão e autenticação com a API oficial da Shopee
   */
  async testConnection(): Promise<{ success: boolean; message: string; endpoint?: string }> {
    if (!this.appId || !this.secretKey) {
      return {
        success: false,
        message: 'App ID e Secret Key são obrigatórios. Preencha os campos para validar.',
      };
    }

    const query = `{
      productOfferV2(keyword: "fone", limit: 1) {
        nodes {
          itemId
          productName
        }
      }
    }`;

    try {
      const data = await this.executeGraphQL(query);
      const total = data?.productOfferV2?.nodes?.length ?? 0;
      return {
        success: true,
        message: `Autenticação bem-sucedida com a Shopee Affiliate API! A API respondeu com dados reais (${total} oferta de teste encontrada).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na autenticação da Shopee API: ${err.message}`,
      };
    }
  }

  /**
   * Busca ofertas reais na Shopee aplicando os filtros solicitados no Radar
   */
  async searchOffers(config: RadarFilterConfig): Promise<SearchOffersResult> {
    const isGeral =
      !config.categoria ||
      config.categoria.toLowerCase().includes('geral') ||
      config.categoria.toLowerCase().includes('todas');

    const customKeyword = config.palavrasChave?.trim() ? config.palavrasChave.trim().replace(/"/g, '') : '';
    const keyword = customKeyword || (isGeral ? '' : config.categoria.replace(/"/g, ''));
    const targetLimit = Math.min(Math.max(config.limitePorBusca || 20, 1), 50);

    // Se NÃO tiver credenciais configuradas:
    if (!this.appId || !this.secretKey) {
      throw new Error(
        'API da Shopee não configurada! Vá na aba "Configuração Shopee", insira seu App ID e Secret Key oficiais e salve.'
      );
    }

    // Para garantir que tenhamos produtos suficientes para cumprir a meta solicitada após os filtros,
    // buscamos páginas da API da Shopee com lote de 50 itens.
    const maxPages = targetLimit > 30 ? 3 : 2;
    const allNodes: any[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        const keywordClause = keyword ? `keyword: "${keyword}", ` : '';
        const query = `{
          productOfferV2(${keywordClause}page: ${page}, limit: 50, sortType: 1) {
            nodes {
              itemId
              productName
              imageUrl
              priceMin
              priceMax
              priceDiscountRate
              sales
              ratingStar
              shopName
              productLink
              offerLink
            }
            pageInfo {
              page
              limit
              hasNextPage
            }
          }
        }`;

        const data = await this.executeGraphQL(query);
        const nodes = data?.productOfferV2?.nodes || [];
        if (Array.isArray(nodes) && nodes.length > 0) {
          allNodes.push(...nodes);
        }

        // Se a Shopee não tiver mais páginas ou já tivermos pelo menos 100 itens, encerra a busca
        if (!data?.productOfferV2?.pageInfo?.hasNextPage || allNodes.length >= 100) {
          break;
        }
      }

      // Se por acaso a busca por palavra específica não retornar nada, tenta sem a palavra (fallback amplo)
      if (allNodes.length === 0 && customKeyword) {
        const fallbackQuery = `{
          productOfferV2(page: 1, limit: 50, sortType: 1) {
            nodes {
              itemId
              productName
              imageUrl
              priceMin
              priceMax
              priceDiscountRate
              sales
              ratingStar
              shopName
              productLink
              offerLink
            }
          }
        }`;
        const fallbackData = await this.executeGraphQL(fallbackQuery);
        const fallbackNodes = fallbackData?.productOfferV2?.nodes || [];
        if (Array.isArray(fallbackNodes)) {
          allNodes.push(...fallbackNodes);
        }
      }

      if (allNodes.length === 0) {
        return {
          products: [],
          totalFound: 0,
          hasNextPage: false,
        };
      }

      return this.processShopeeNodes(allNodes, config, targetLimit);
    } catch (err: any) {
      await db.addLog({
        modulo: 'shopee',
        evento: 'Erro na Busca da API Oficial',
        status: 'erro',
        mensagem: `Erro retornado pela Shopee: ${err.message}`,
        detalhes: { keyword, categoria: config.categoria, err: String(err) },
      });

      // Lança o erro com detalhes para a interface do usuário!
      throw new Error(`Falha na Shopee Affiliate API: ${err.message}`);
    }
  }

  /**
   * Processa os nós retornados da API da Shopee aplicando filtros e score de forma inteligente
   * para sempre entregar a quantidade de produtos solicitada pelo usuário.
   */
  private processShopeeNodes(
    nodes: any[],
    config: RadarFilterConfig,
    targetLimit: number = 20
  ): SearchOffersResult {
    // 1. Deduplicação por itemId
    const seen = new Set<string>();
    const uniqueNodes: any[] = [];
    for (const item of nodes) {
      if (!item || !item.itemId || !item.productName) continue;
      const key = String(item.itemId);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNodes.push(item);
      }
    }

    const minDesc = config.descontoMinimo ?? 15;
    const minAval = config.avaliacaoMinima ?? 4.0;
    const minVendas = config.vendasMinimas ?? 10;
    const precoMin = config.precoMinimo || 0;
    const precoMax = config.precoMaximo || 999999;

    interface ScoredProduct {
      product: Omit<Product, 'id' | 'status' | 'created_at'>;
      passesStrict: boolean;
      passesModerate: boolean;
      score: number;
    }

    const candidateList: ScoredProduct[] = [];

    for (const item of uniqueNodes) {
      const preco = parseFloat(item.priceMin || item.priceMax || 0);
      const descontoRate = parseFloat(item.priceDiscountRate || 0);
      const vendas = parseInt(item.sales || 0, 10);
      const avaliacao = parseFloat(item.ratingStar || 0);

      // Validação básica de preço e integridade
      if (preco <= 0 && (!item.priceMin && !item.priceMax)) continue;
      if (precoMin > 0 && preco < precoMin) continue;
      if (precoMax > 0 && preco > precoMax) continue;

      // Filtro de exclusão: Nunca processar ou cadastrar roupas femininas
      if (isRoupaFeminina(item.productName, config.categoria)) continue;

      let precoAntigo = preco;
      if (descontoRate > 0) {
        precoAntigo = parseFloat((preco / (1 - descontoRate / 100)).toFixed(2));
      }

      // Pontuação Ponderada 0 - 100
      const scoreDesconto = Math.min((descontoRate / 70) * 40, 40);
      const scoreAvaliacao = Math.max(0, Math.min(((avaliacao - 3.5) / 1.5) * 30, 30));
      const scoreVendas = Math.min((vendas / 500) * 20, 20);
      const scorePreco = preco <= 150 ? 10 : preco <= 350 ? 8 : preco <= 600 ? 6 : 5;
      const scoreTotal = parseFloat((scoreDesconto + scoreAvaliacao + scoreVendas + scorePreco).toFixed(2));

      // Nível 1: Critério estrito do usuário
      const passesStrict =
        descontoRate >= minDesc &&
        avaliacao >= minAval &&
        vendas >= minVendas;

      // Nível 2: Critério moderado (caso poucos produtos atinjam o estrito)
      const passesModerate =
        descontoRate >= Math.max(5, minDesc * 0.5) &&
        avaliacao >= Math.max(3.8, minAval - 0.5) &&
        vendas >= Math.max(5, Math.floor(minVendas * 0.2));

      candidateList.push({
        product: {
          marketplace: 'shopee',
          external_item_id: String(item.itemId),
          nome: item.productName,
          imagem: item.imageUrl,
          preco,
          preco_antigo: precoAntigo,
          desconto: descontoRate,
          avaliacao,
          vendas,
          categoria: config.categoria,
          loja: item.shopName || 'Loja Parceira Shopee',
          url_original: item.productLink || '',
          url_afiliado: item.offerLink || item.productLink || '',
          score: scoreTotal,
        },
        passesStrict,
        passesModerate,
        score: scoreTotal,
      });
    }

    // Ordena do maior score para o menor
    candidateList.sort((a, b) => b.score - a.score);

    // 1º passo: Adiciona os produtos que passaram estritamente
    const selected: Omit<Product, 'id' | 'status' | 'created_at'>[] = [];
    const usedIds = new Set<string>();

    for (const item of candidateList) {
      if (item.passesStrict && selected.length < targetLimit) {
        selected.push(item.product);
        usedIds.add(item.product.external_item_id);
      }
    }

    // 2º passo: Se ainda faltam produtos para atingir a quantidade solicitada, preenche com moderados
    if (selected.length < targetLimit) {
      for (const item of candidateList) {
        if (!usedIds.has(item.product.external_item_id) && item.passesModerate && selected.length < targetLimit) {
          selected.push(item.product);
          usedIds.add(item.product.external_item_id);
        }
      }
    }

    // 3º passo: Se ainda assim faltarem produtos, completa com os melhores restantes pelo score
    if (selected.length < targetLimit) {
      for (const item of candidateList) {
        if (!usedIds.has(item.product.external_item_id) && selected.length < targetLimit) {
          selected.push(item.product);
          usedIds.add(item.product.external_item_id);
        }
      }
    }

    return {
      products: selected,
      totalFound: selected.length,
      hasNextPage: false,
    };
  }

  /**
   * Gera link de afiliado oficial encurtado via mutation GraphQL da Shopee
   */
  async generateAffiliateLink(originUrl: string, subIds: string[] = ['telegram']): Promise<string> {
    if (!this.appId || !this.secretKey) {
      return originUrl;
    }

    const mutation = `mutation {
      generateShortLink(input: { originUrl: "${originUrl}", subIds: [${subIds.map((s) => `"${s}"`).join(',')}] }) {
        shortLink
      }
    }`;

    try {
      const data = await this.executeGraphQL(mutation);
      return data?.generateShortLink?.shortLink || originUrl;
    } catch {
      return originUrl;
    }
  }

  async getProductDetails(itemId: string): Promise<Partial<Product> | null> {
    return null;
  }
}
