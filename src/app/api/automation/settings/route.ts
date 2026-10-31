import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.getAutomationSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await db.saveAutomationSettings(body);

    await db.addLog({
      modulo: 'automacao',
      evento: 'Configuração Atualizada',
      status: 'sucesso',
      mensagem: `Automação ${updated.ativo ? 'ATIVADA' : 'PAUSADA'} com meta de ${updated.quantidade_diaria} ofertas diárias.`,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

