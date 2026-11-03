// Endpoint Serverless para N8N + Vercel + Supabase
// Executa o pipeline sob demanda e encerra a função serverless

import { NextResponse } from 'next/server';
import { defaultShopeeService } from '@/services/shopee';
import { defaultSupabaseService, ProdutoDB } from '@/services/supabase';
import { defaultPostGeneratorService } from '@/services/postGenerator';
import { defaultTelegramService } from '@/services/telegram';
import { AutomationLogger } from '@/utils/logger';
import { db } from '@/lib/db';
import { isRoupaFeminina } from '@/lib/filters';
import { verificarPausaNoturna } from '@/lib/schedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos para execução na Vercel

export async function POST(req: Request) {
  const logger = new AutomationLogger();

  try {
    logger.info('Iniciando automação...');

    const body = await req.json().catch(() => ({}));
    const categoria = body.categoria || 'Geral';
    const targetChatId = body.chatId || body.chat_id;
    const forcarDisparo = body.forcar_disparo === true || body.ignorar_pausa === true;

    // Regra do Piloto Automático: Roda o dia todo, pausando apenas entre 00:30 e 06:00 (Brasília)
    const statusPausa = verificarPausaNoturna();
    if (statusPausa.emPausa && !forcarDisparo) {
      logger.info(statusPausa.mensagem);
      logger.info(`Próxima retomada das postagens: ${statusPausa.proximaRetomada}.`);
      logger.info('Automação em repouso noturno.');

      await db.addLog({
        modulo: 'automacao',
        evento: 'Pausa Noturna (00:30 às 06:00)',
        status: 'sucesso',
        mensagem: statusPausa.mensagem,
        detalhes: { hora: statusPausa.horaAtualFormatada, proxima: statusPausa.proximaRetomada },
      });

      return NextResponse.json({
        success: true,
        em_pausa_noturna: true,
        hora_brasilia: statusPausa.horaAtualFormatada,
        message: statusPausa.mensagem,
        proxima_retomada: statusPausa.proximaRetomada,
        logs: logger.getLogs(),
        logs_texto: logger.getText(),
      });
    }

    // Etapa 1: Buscar novos produtos utilizando a API da Shopee
    logger.info('Buscando produtos...');
    let produtosShopee = await defaultShopeeService.buscarOfertas(1, 40, categoria);
    logger.info(`${produtosShopee.length} produtos encontrados.`);

    // Etapa 2: Salvar no Supabase verificando duplicidade pelo produto_id (respeitando cooldown de 14 dias / 2 semanas)
    let resultadoSalvar = await defaultSupabaseService.salvarNovosProdutos(produtosShopee, 14);
    logger.info(`${resultadoSalvar.existiam} já existiam.`);
    logger.info(`${resultadoSalvar.adicionados} novos produtos adicionados.`);

    // Etapa 3: Selecionar apenas um produto elegível (nunca publicado OU publicado há mais de 2 semanas)
    logger.info('Selecionando próximo produto (trava anti-repetição de 2 semanas ativa)...');
    let produtoParaPostar: ProdutoDB | null = await defaultSupabaseService.obterProximoElegivel(14);

    // Caso não existam produtos elegíveis na fila:
    // Realiza uma nova busca na Shopee (página 2, página 3 ou termos alternativos)
    if (!produtoParaPostar) {
      logger.info('Nenhum produto livre na fila. Realizando busca avançada na Shopee (página 2)...');
      const produtosPagina2 = await defaultShopeeService.buscarOfertas(2, 40, categoria);
      const resultado2 = await defaultSupabaseService.salvarNovosProdutos(produtosPagina2, 14);
      logger.info(`${resultado2.adicionados} novos produtos adicionados na segunda busca.`);

      produtoParaPostar = await defaultSupabaseService.obterProximoElegivel(14);
    }

    if (!produtoParaPostar) {
      const termosAlternativos = ['Utilidades', 'Casa', 'Eletrônicos', 'Ferramentas'];
      for (const termo of termosAlternativos) {
        if (produtoParaPostar) break;
        logger.info(`Buscando ofertas frescas na categoria "${termo}"...`);
        const prodsAlt = await defaultShopeeService.buscarOfertas(1, 40, termo);
        const resAlt = await defaultSupabaseService.salvarNovosProdutos(prodsAlt, 14);
        logger.info(`${resAlt.adicionados} novos produtos adicionados em ${termo}.`);
        produtoParaPostar = await defaultSupabaseService.obterProximoElegivel(14);
      }
    }

    // Se mesmo assim não existir nenhum produto novo:
    if (!produtoParaPostar) {
      const msg = 'Nenhum produto novo encontrado.';
      logger.info(msg);
      logger.info('Automação finalizada.');

      await db.addLog({
        modulo: 'automacao',
        evento: 'N8N Serverless: Sem produtos novos',
        status: 'sucesso',
        mensagem: msg,
        detalhes: { logs: logger.getLogs() },
      });

      return NextResponse.json({
        success: true,
        message: msg,
        logs: logger.getLogs(),
        logs_texto: logger.getText(),
      });
    }

    // Filtro adicional de segurança: se for roupa feminina, descarta e tenta selecionar outro
    while (produtoParaPostar && isRoupaFeminina(produtoParaPostar.titulo, produtoParaPostar.categoria)) {
      logger.info(`Produto "${produtoParaPostar.titulo}" ignorado (filtro anti-roupas femininas ativo).`);
      await defaultSupabaseService.marcarComoPublicado(produtoParaPostar.produto_id);
      produtoParaPostar = await defaultSupabaseService.obterProximoElegivel(14);
    }

    if (!produtoParaPostar) {
      const msg = 'Nenhum produto elegível disponível após aplicação dos filtros de exclusão.';
      logger.info(msg);
      return NextResponse.json({
        success: true,
        message: msg,
        logs: logger.getLogs(),
      });
    }

    // Validação estrita: confirmar se o produto realmente não foi publicado nos últimos 14 dias
    if (defaultSupabaseService.estaEmCooldown(produtoParaPostar.data_publicacao, 14)) {
      const msg = 'Produto selecionado já foi publicado nos últimos 14 dias (cooldown de 2 semanas). Ignorando para evitar repetição.';
      logger.info(msg);
      return NextResponse.json({
        success: true,
        message: msg,
        logs: logger.getLogs(),
      });
    }

    if (produtoParaPostar.data_publicacao) {
      const dias = Math.floor(
        (Date.now() - new Date(produtoParaPostar.data_publicacao).getTime()) / (1000 * 60 * 60 * 24)
      );
      logger.info(
        `Produto escolhido:\n${produtoParaPostar.titulo}\n(Status: Re-publicação liberada após ${dias} dias - intervalo mínimo de 2 semanas cumprido)`
      );
    } else {
      logger.info(`Produto escolhido:\n${produtoParaPostar.titulo}\n(Status: Produto inédito - nunca postado anteriormente)`);
    }

    // Etapa 4: Gerar automaticamente a postagem utilizando o layout oficial
    logger.info('Gerando postagem...');
    const postGerado = await defaultPostGeneratorService.generatePost(produtoParaPostar);

    // Etapa 5: Enviar automaticamente para o Telegram
    logger.info('Enviando para Telegram...');

    // Recupera canais de destino configurados
    let destinos: string[] = [];
    if (targetChatId) {
      destinos = [targetChatId];
    } else if (process.env.TELEGRAM_CHAT_ID) {
      destinos = [process.env.TELEGRAM_CHAT_ID];
    } else {
      const canais = await db.getChannels();
      const canaisAtivos = canais.filter((c) => c.ativo && c.tipo !== 'admin');
      destinos = canaisAtivos.map((c) => c.chat_id);
    }

    if (destinos.length === 0) {
      destinos = [process.env.TELEGRAM_CHAT_ID || '@radarsshopee']; // Fallback padrão
    }

    let envioComSucesso = false;
    let ultimoErro = '';

    for (const chat of destinos) {
      const envio = await defaultTelegramService.publishOffer({
        chatId: chat,
        photoUrl: postGerado.imagemUrl,
        caption: postGerado.legenda,
        affiliateUrl: postGerado.linkAfiliado,
        buttonText: postGerado.botaoTexto,
      });

      if (envio.success) {
        envioComSucesso = true;
        await db.addPublication({
          product_id: produtoParaPostar.produto_id,
          telegram_channel: chat,
          telegram_message_id: envio.messageId,
          legenda_enviada: postGerado.legenda,
          status: 'publicado',
        });
      } else {
        ultimoErro = envio.error || 'Erro desconhecido ao enviar ao Telegram';
        logger.error(`Falha no envio para ${chat}: ${ultimoErro}`);
      }
    }

    if (!envioComSucesso) {
      throw new Error(`Falha no envio da mensagem para o Telegram: ${ultimoErro}`);
    }

    logger.info('Mensagem enviada com sucesso.');

    // Etapa 6: Atualizar banco marcando publicado = true e data_publicacao
    logger.info('Atualizando banco...');
    await defaultSupabaseService.marcarComoPublicado(produtoParaPostar.produto_id);

    logger.info('Automação finalizada.');

    await db.addLog({
      modulo: 'telegram',
      evento: 'N8N Serverless: Oferta Publicada',
      status: 'sucesso',
      mensagem: `Oferta "${produtoParaPostar.titulo.substring(0, 40)}..." publicada via N8N com sucesso.`,
      detalhes: {
        produto_id: produtoParaPostar.produto_id,
        link: produtoParaPostar.link_afiliado,
        logs: logger.getLogs(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Automação finalizada com sucesso.',
      produto: {
        produto_id: produtoParaPostar.produto_id,
        titulo: produtoParaPostar.titulo,
        preco: produtoParaPostar.preco,
        link_afiliado: produtoParaPostar.link_afiliado,
        publicado: true,
        data_publicacao: new Date().toISOString(),
      },
      logs: logger.getLogs(),
      logs_texto: logger.getText(),
    });
  } catch (err: any) {
    logger.error('Falha na automação', err);

    await db.addLog({
      modulo: 'automacao',
      evento: 'N8N Serverless: Erro',
      status: 'erro',
      mensagem: `Erro na execução serverless: ${err.message}`,
      detalhes: { logs: logger.getLogs() },
    });

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        logs: logger.getLogs(),
        logs_texto: logger.getText(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/postar-oferta',
    metodo: 'POST',
    descricao: 'Automação Serverless para acionamento via N8N ou Webhook na Vercel.',
    exemplo_payload: {
      categoria: 'Geral',
      chatId: '@radarsshopee',
    },
  });
}

