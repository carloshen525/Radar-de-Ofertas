import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ProductStatus } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ProductStatus | null;
    const categoria = searchParams.get('categoria') || undefined;

    const products = await db.getProducts(status || undefined, categoria);
    return NextResponse.json(products);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ProductStatus | null;

    const result = await db.clearProducts(status || undefined);

    await db.addLog({
      modulo: 'sistema',
      evento: 'Limpeza de Produtos',
      status: 'sucesso',
      mensagem: `${result.count} produto(s) removido(s) da esteira ${status ? `com status "${status}"` : 'por completo'}.`,
    });

    return NextResponse.json({ success: true, removed: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

