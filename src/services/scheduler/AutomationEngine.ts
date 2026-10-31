// Motor de Automações e Jobs em Background do Radar Shopee

import { db } from '@/lib/db';
import { getMarketplaceProvider } from '@/services/marketplace';
import { defaultAIService } from '@/services/ai/AIService';
import { defaultTelegramService } from '@/services/telegram/TelegramService';
import { RadarFilterConfig, Product } from '@/lib/types';

export class AutomationEngine {
  private static isRunning = false;

  /**
   * Job 1: Buscar novos produtos nas categorias cadastradas
   */
  async runJob1SearchProducts(customFilters?: Partial<RadarFilterConfig>): Promise<{ found: number; saved: number }> {
    const config = await db.getShopeeConfig();
    const provider = getMarketplaceProvider('shopee', {
      appId: config.appId,
      secretKey: config.secretKey,
    });

    const searchConfig: RadarFilterConfig = {
      categoria: customFilters?.categoria || 'Geral (Buscar de Tudo)',
      palavrasChave: customFilters?.palavrasChave,
      descontoMinimo: customFilters?.descontoMinimo ?? 15,
      avaliacaoMinima: customFilters?.avaliacaoMinima ?? 4.0,
      vendasMinimas: customFilters?.vendasMinimas ?? 10,
      precoMinimo: customFilters?.precoMinimo ?? 0,
      precoMaximo: customFilters?.precoMaximo ?? 1500,
      limitePorBusca: customFilters?.limitePorBusca ?? 20,
    };

    try {
      const results = await provider.searchOffers(searchConfig);
      let saved = 0;

      for (const prod of results.products) {
        await db.addProduct({
          ...prod,
          status: 'encontrado',
        });
        saved++;
      }

      await db.addLog({
        modulo: 'shopee',
        evento: 'Job 1: Busca de Produtos',
        status: 'sucesso',
        mensagem: `Busca finalizada na categoria ${searchConfig.categoria}. ${results.totalFound} encontrados, ${saved} cadastrados.`,
        detalhes: { categoria: searchConfig.categoria, salvos: saved },
      });

      return { found: results.totalFound, saved };
    } catch (err: any) {
      await db.addLog({
        modulo: 'shopee',
        evento: 'Job 1: Busca de Produtos',
        status: 'erro',
        mensagem: `Falha ao executar radar de busca: ${err.message}`,
      });
      throw err;
    }
  }

  /**
   * Job 2: Analisar oportunidades e aplicar pontuação (Score 0-100)
   */
  async runJob2AnalyzeOpportunities(): Promise<{ analyzed: number; approved: number }> {
    try {
      const settings = await db.getAutomationSettings();
      const produtosEncontrados = await db.getProducts('encontrado');

      let approved = 0;
      for (const prod of produtosEncontrados) {
        // Cálculo da pontuação
        const score = prod.score || 70;
        const deveAprovar = score >= settings.auto_aprovar_score_minimo;

        await db.updateProduct(prod.id, {
          status: deveAprovar ? 'aprovado' : 'analisando',
          score,
        });

        if (deveAprovar) approved++;
      }

      await db.addLog({
        modulo: 'automacao',
        evento: 'Job 2: Análise de Oportunidades',
        status: 'sucesso',
        mensagem: `${produtosEncontrados.length} produtos analisados. ${approved} aprovados com score >= ${settings.auto_aprovar_score_minimo}.`,
      });

      return { analyzed: produtosEncontrados.length, approved };
    } catch (err: any) {
      await db.addLog({
        modulo: 'automacao',
        evento: 'Job 2: Análise de Oportunidades',
        status: 'erro',
        mensagem: `Erro na esteira de análise: ${err.message}`,
      });
      throw err;
    }
  }

  /**
   * Job 3: Gerar conteúdo com Inteligência Artificial para aprovados
   */
  async runJob3GenerateContent(): Promise<{ generated: number }> {
    try {
      const aprovados = await db.getProducts('aprovado');
      const semCopy = aprovados.filter((p) => !p.legenda_ia || p.legenda_ia.length < 10);

      let generated = 0;
      for (const prod of semCopy.slice(0, 10)) {
        const copy = await defaultAIService.generateTelegramCopy({
          nome: prod.nome,
          preco: prod.preco,
          precoAntigo: prod.preco_antigo,
          desconto: prod.desconto,
          avaliacao: prod.avaliacao,
          vendas: prod.vendas,
          categoria: prod.categoria,
          loja: prod.loja,
        });

        await db.updateProduct(prod.id, {
          legenda_ia: copy,
        });
        generated++;
      }

      if (generated > 0) {
        await db.addLog({
          modulo: 'ia',
          evento: 'Job 3: Geração de Conteúdo IA',
          status: 'sucesso',
          mensagem: `${generated} legendas de alta conversão geradas e salvas na esteira.`,
        });
      }

      return { generated };
    } catch (err: any) {
      await db.addLog({
        modulo: 'ia',
        evento: 'Job 3: Geração de Conteúdo IA',
        status: 'erro',
        mensagem: `Erro ao gerar copy de produto com IA: ${err.message}`,
      });
      throw err;
    }
  }

  /**
   * Job 4: Publicar no Telegram com controle rigoroso de duplicidade
   */
  async runJob4PublishTelegram(): Promise<{ published: number; errors: number }> {
    try {
      const canais = await db.getChannels();
      const canaisAtivos = canais.filter((c) => c.ativo && c.tipo !== 'admin');

      if (canaisAtivos.length === 0) {
        return { published: 0, errors: 0 };
      }

      const produtosAprovados = await db.getProducts('aprovado');
      const produtosProntos = produtosAprovados
        .filter((p) => p.legenda_ia && p.legenda_ia.length > 10)
        .sort((a, b) => b.score - a.score);

      const publicacoesExistentes = await db.getPublications();
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
      const agora = Date.now();

      // Encontra produtos prontos elegíveis: nunca publicados OU cuja última publicação ocorreu há mais de 14 dias (2 semanas)
      const produtosNaoPublicados = produtosProntos.filter((prod) => {
        const publicacoesDeste = publicacoesExistentes.filter(
          (pub) => pub.product_id === prod.id && pub.status === 'publicado'
        );

        if (publicacoesDeste.length === 0) return true; // Nunca publicado

        // Se tiver sido publicado, verifica se ocorreu dentro da janela de 14 dias
        const publicadoRecentemente = publicacoesDeste.some((pub) => {
          const pubTime = new Date(pub.published_at).getTime();
          return agora - pubTime < TWO_WEEKS_MS;
        });

        return !publicadoRecentemente; // Liberado se já passaram 14 dias
      });

      // Se algum produto já foi publicado nos últimos 14 dias mas ainda consta como 'aprovado', atualiza para 'publicado'
      for (const prod of produtosProntos) {
        const publicadoRecentemente = publicacoesExistentes.some(
          (pub) =>
            pub.product_id === prod.id &&
            pub.status === 'publicado' &&
            agora - new Date(pub.published_at).getTime() < TWO_WEEKS_MS
        );
        if (publicadoRecentemente && prod.status !== 'publicado') {
          await db.updateProduct(prod.id, { status: 'publicado' });
        }
      }

      if (produtosNaoPublicados.length === 0) {
        return { published: 0, errors: 0 };
      }

      let published = 0;
      let errors = 0;

      // Publica até 2 produtos elegíveis por ciclo
      const batch = produtosNaoPublicados.slice(0, 2);

      for (const produto of batch) {
        for (const canal of canaisAtivos) {
          const jaPublicadoRecentementeNesseCanal = publicacoesExistentes.some(
            (pub) =>
              pub.product_id === produto.id &&
              pub.telegram_channel === canal.chat_id &&
              pub.status === 'publicado' &&
              agora - new Date(pub.published_at).getTime() < TWO_WEEKS_MS
          );

          if (jaPublicadoRecentementeNesseCanal) continue;

          const resultado = await defaultTelegramService.publishOffer({
            chatId: canal.chat_id,
            photoUrl: produto.imagem,
            caption: produto.legenda_ia!,
            affiliateUrl: produto.url_afiliado || produto.url_original,
            buttonText: '🛒 Comprar agora',
          });

          if (resultado.success) {
            await db.addPublication({
              product_id: produto.id,
              telegram_channel: canal.chat_id,
              telegram_message_id: resultado.messageId,
              legenda_enviada: produto.legenda_ia,
              status: 'publicado',
            });

            await db.updateProduct(produto.id, {
              status: 'publicado',
            });

            published++;
          } else {
            errors++;
            await db.addPublication({
              product_id: produto.id,
              telegram_channel: canal.chat_id,
              mensagem_erro: resultado.error,
              status: 'erro',
            });
          }
        }
      }

      if (published > 0) {
        await db.addLog({
          modulo: 'telegram',
          evento: 'Job 4: Publicação no Telegram',
          status: 'sucesso',
          mensagem: `${published} nova(s) oferta(s) com link de afiliado publicada(s) no Telegram com sucesso!`,
        });
      }

      return { published, errors };
    } catch (err: any) {
      await db.addLog({
        modulo: 'telegram',
        evento: 'Job 4: Publicação no Telegram',
        status: 'erro',
        mensagem: `Erro no job de publicação Telegram: ${err.message}`,
      });
      throw err;
    }
  }

  /**
   * Job 5: Gerar relatórios e auditoria
   */
  async runJob5GenerateReport(): Promise<any> {
    const stats = await db.getDashboardStats();
    await db.addLog({
      modulo: 'automacao',
      evento: 'Job 5: Relatório Diário',
      status: 'sucesso',
      mensagem: `Relatório consolidado: ${stats.produtosEncontradosHoje} encontrados hoje, ${stats.produtosAprovados} aprovados, ${stats.produtosPublicadosHoje} publicados.`,
      detalhes: stats,
    });
    return stats;
  }

  /**
   * Executa a esteira completa (Pipeline E2E)
   */
  async runFullPipeline(): Promise<any> {
    if (AutomationEngine.isRunning) {
      return { message: 'Automação já está em andamento.' };
    }

    AutomationEngine.isRunning = true;
    try {
      const step1 = await this.runJob1SearchProducts();
      const step2 = await this.runJob2AnalyzeOpportunities();
      const step3 = await this.runJob3GenerateContent();
      const step4 = await this.runJob4PublishTelegram();
      const step5 = await this.runJob5GenerateReport();

      return {
        success: true,
        summary: {
          busca: step1,
          analise: step2,
          ia: step3,
          publicacao: step4,
          relatorio: step5,
        },
      };
    } finally {
      AutomationEngine.isRunning = false;
    }
  }
}

export const automationEngine = new AutomationEngine();

