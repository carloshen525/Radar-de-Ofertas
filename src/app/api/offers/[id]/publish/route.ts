import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { defaultTelegramService } from '@/services/telegram/TelegramService';
import { defaultAIService } from '@/services/ai/AIService';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const targetChannelId = body.channelId;

    const products = await db.getProducts();
    const product = products.find((p) => p.id === id);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Se ainda não tiver legenda, gera uma agora
    let copy = product.legenda_ia;
    if (!copy || copy.length < 10) {
      copy = await defaultAIService.generateTelegramCopy({
        nome: product.nome,
        preco: product.preco,
        precoAntigo: product.preco_antigo,
        desconto: product.desconto,
        avaliacao: product.avaliacao,
        vendas: product.vendas,
        categoria: product.categoria,
        loja: product.loja,
      });
      await db.updateProduct(id, { legenda_ia: copy });
    }

    const canais = await db.getChannels();
    const canaisParaEnviar = targetChannelId
      ? canais.filter((c) => c.chat_id === targetChannelId || c.id === targetChannelId)
      : canais.filter((c) => c.ativo && c.tipo !== 'admin');

    if (canaisParaEnviar.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum canal ativo do Telegram encontrado para publicação.' },
        { status: 400 }
      );
    }

    const resultados = [];
    for (const canal of canaisParaEnviar) {
      const envio = await defaultTelegramService.publishOffer({
        chatId: canal.chat_id,
        photoUrl: product.imagem,
        caption: copy,
        affiliateUrl: product.url_afiliado || product.url_original,
        buttonText: '🛒 Comprar agora',
      });

      if (envio.success) {
        await db.addPublication({
          product_id: product.id,
          telegram_channel: canal.chat_id,
          telegram_message_id: envio.messageId,
          legenda_enviada: copy,
          status: 'publicado',
        });
        resultados.push({ canal: canal.nome, status: 'enviado' });
      } else {
        await db.addPublication({
          product_id: product.id,
          telegram_channel: canal.chat_id,
          mensagem_erro: envio.error,
          status: 'erro',
        });
        resultados.push({ canal: canal.nome, status: 'erro', erro: envio.error });
      }
    }

    await db.updateProduct(id, { status: 'publicado' });

    await db.addLog({
      modulo: 'telegram',
      evento: 'Publicação Manual Realizada',
      status: 'sucesso',
      mensagem: `Oferta "${product.nome.substring(0, 40)}..." enviada para ${resultados.length} canal(is).`,
      detalhes: resultados,
    });

    return NextResponse.json({ success: true, resultados });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

