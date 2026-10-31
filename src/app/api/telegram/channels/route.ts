import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cleanTelegramChatId } from '@/lib/storage';

export async function GET() {
  try {
    const channels = await db.getChannels();
    return NextResponse.json(channels);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, chat_id, tipo, ativo } = body;

    if (!nome || !chat_id) {
      return NextResponse.json({ error: 'Nome e Chat ID são obrigatórios' }, { status: 400 });
    }

    const cleanChat = cleanTelegramChatId(chat_id);

    const channel = await db.addChannel({
      nome,
      chat_id: cleanChat,
      tipo: tipo || 'canal',
      ativo: ativo ?? true,
    });

    await db.addLog({
      modulo: 'telegram',
      evento: 'Novo Destino Cadastrado',
      status: 'sucesso',
      mensagem: `Canal/Grupo "${nome}" (${cleanChat}) adicionado ao sistema.`,
    });

    return NextResponse.json(channel);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await db.deleteChannel(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

