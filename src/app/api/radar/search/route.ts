import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMarketplaceProvider } from '@/services/marketplace';
import { RadarFilterConfig } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config: RadarFilterConfig = {
      categoria: body.categoria || 'Eletrônicos',
      palavrasChave: body.palavrasChave || '',
      descontoMinimo: parseFloat(body.descontoMinimo) || 30,
      avaliacaoMinima: parseFloat(body.avaliacaoMinima) || 4.5,
      vendasMinimas: parseInt(body.vendasMinimas, 10) || 50,
      precoMinimo: parseFloat(body.precoMinimo) || 0,
      precoMaximo: parseFloat(body.precoMaximo) || 2000,
      limitePorBusca: parseInt(body.limitePorBusca, 10) || 20,
    };

    const shopeeConfig = await db.getShopeeConfig();
    const provider = getMarketplaceProvider('shopee', {
      appId: shopeeConfig.appId,
      secretKey: shopeeConfig.secretKey,
    });

    const results = await provider.searchOffers(config);

    // Salva os produtos encontrados na base
    const salvos = [];
    for (const prod of results.products) {
      const saved = await db.addProduct({
        ...prod,
        status: 'encontrado',
      });
      salvos.push(saved);
    }

    await db.addLog({
      modulo: 'shopee',
      evento: 'Radar de Produtos Executado',
      status: 'sucesso',
      mensagem: `Radar buscou ofertas para "${config.categoria}" (${config.palavrasChave || 'geral'}). ${salvos.length} novas oportunidades salvas.`,
    });

    return NextResponse.json({
      success: true,
      totalEncontrados: results.totalFound,
      salvos,
    });
  } catch (err: any) {
    await db.addLog({
      modulo: 'shopee',
      evento: 'Radar de Produtos Executado',
      status: 'erro',
      mensagem: `Falha no radar: ${err.message}`,
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

