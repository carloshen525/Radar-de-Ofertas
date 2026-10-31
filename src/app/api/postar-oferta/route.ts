// Endpoint Serverless para N8N + Vercel + Supabase
// Executa o pipeline sob demanda e encerra a função serverless

import { NextResponse } from 'next/server';
import { defaultShopeeService } from '@/services/shopee';
import { defaultSupabaseService, ProdutoDB } from '@/services/supabase';
import { defaultPostGeneratorService } from '@/services/postGenerator';
import { defaultTelegramService } from '@/services/telegram';
import { AutomationLogger } from '@/utils/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos para execução na Vercel

export async function POST(req: Request) {
  const logger = new AutomationLogger();

  try {
    logger.info('Iniciando automação...');

    const body = await req.json().catch(() => ({}));
    const categoria = body.categoria || 'Geral';
    const targetChatId = body.chatId || body.chat_id;

    // Etapa 1: Buscar novos produtos utilizando a API da Shopee
    logger.info('Buscando produtos...');
    let produtosShopee = await defaultShopeeService.buscarOfertas(1, 40, categoria);
    logger.info(`${produtosShopee.length} produtos encontrados.`);

    // Etapa 2: Salvar no Supabase verificando duplicidade pelo produto_id
    let resultadoSalvar = await defaultSupabaseService.salvarNovosProdutos(produtosShopee);
    logger.info(`${resultadoSalvar.existiam} já existiam.`);
    logger.info(`${resultadoSalvar.adicionados} novos produtos adicionados.`);

    // Etapa 3: Selecionar apenas um produto ainda não publicado (mais antigo)
    logger.info('Selecionando próximo produto...');
    let produtoParaPostar: ProdutoDB | null = await defaultSupabaseService.obterProximoNaoPublicado();

    // Caso não existam produtos inéditos na fila:
    // Realiza uma nova busca na Shopee (página 2 ou termo alternativo)
    if (!produtoParaPostar) {
      logger.info('Todos os produtos já foram publicados. Realizando nova busca na Shopee...');
      const produtosPagina2 = await defaultShopeeService.buscarOfertas(2, 40, categoria);
      const resultado2 = await defaultSupabaseService.salvarNovosProdutos(produtosPagina2);
      logger.info(`${resultado2.adicionados} novos produtos adicionados na segunda busca.`);

      produtoParaPostar = await defaultSupabaseService.obterProximoNaoPublicado();
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

    // Validação estrita: confirmar se o produto realmente ainda não foi publicado
    if (produtoParaPostar.publicado) {
      const msg = 'Produto selecionado já constava como publicado. Ignorando para evitar duplicidade.';
      logger.info(msg);
      return NextResponse.json({
        success: true,
        message: msg,
        logs: logger.getLogs(),
      });
    }

    logger.info(`Produto escolhido:\n${produtoParaPostar.titulo}`);

    // Etapa 4: Gerar automaticamente a postagem utilizando o layout oficial
    logger.info('Gerando postagem...');
    const postGerado = await defaultPostGeneratorService.generatePost(produtoParaPostar);

    // Etapa 5: Enviar automaticamente para o Telegram
    logger.info('Enviando para Telegram...');

    // Recupera canais de destino configurados
    let destinos: string[] = [];
    if (targetChatId) {
      destinos = [targetChatId];
    } else {
      const canais = await db.getChannels();
      const canaisAtivos = canais.filter((c) => c.ativo && c.tipo !== 'admin');
      destinos = canaisAtivos.map((c) => c.chat_id);
    }

    if (destinos.length === 0) {
      destinos = ['@radarsshopee']; // Fallback padrão
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

