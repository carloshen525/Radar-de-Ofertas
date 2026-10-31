// Gerador de Postagens e Conteúdo para Telegram com Emojis, CTA e Alta Conversão

import { defaultAIService } from '@/services/ai/AIService';
import { ProdutoDB } from '@/services/supabase/SupabaseService';

export interface GeneratedPost {
  legenda: string;
  imagemUrl: string;
  linkAfiliado: string;
  botaoTexto: string;
}

export class PostGeneratorService {
  /**
   * Gera a postagem completa a partir do produto seguindo rigorosamente o layout oficial
   */
  async generatePost(produto: ProdutoDB): Promise<GeneratedPost> {
    const desconto = produto.desconto || (
      produto.preco_original && produto.preco_original > produto.preco
        ? Math.round(((produto.preco_original - produto.preco) / produto.preco_original) * 100)
        : 25
    );

    const copy = await defaultAIService.generateTelegramCopy({
      nome: produto.titulo,
      preco: produto.preco,
      precoAntigo: produto.preco_original || undefined,
      desconto,
      avaliacao: produto.avaliacao || 4.8,
      vendas: produto.vendas || 500,
      categoria: produto.categoria || 'Geral',
      loja: produto.loja || 'Loja Parceira Shopee',
    });

    return {
      legenda: copy,
      imagemUrl: produto.imagem || '',
      linkAfiliado: produto.link_afiliado,
      botaoTexto: '🛒 Comprar agora',
    };
  }
}

export const defaultPostGeneratorService = new PostGeneratorService();

