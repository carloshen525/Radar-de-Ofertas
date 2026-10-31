import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { defaultAIService } from '@/services/ai/AIService';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const products = await db.getProducts();
    const product = products.find((p) => p.id === id);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const copy = await defaultAIService.generateTelegramCopy({
      nome: product.nome,
      preco: product.preco,
      precoAntigo: product.preco_antigo,
      desconto: product.desconto,
      avaliacao: product.avaliacao,
      vendas: product.vendas,
      categoria: product.categoria,
      loja: product.loja,
    });

    const updated = await db.updateProduct(id, {
      legenda_ia: copy,
    });

    await db.addLog({
      modulo: 'ia',
      evento: 'Copy Gerada com IA',
      status: 'sucesso',
      mensagem: `Legenda criada/atualizada com sucesso para "${product.nome.substring(0, 40)}...".`,
    });

    return NextResponse.json({ success: true, copy, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

