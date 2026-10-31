import { NextResponse } from 'next/server';
import { defaultTelegramService } from '@/services/telegram/TelegramService';
import { db } from '@/lib/db';
import { fileStorage } from '@/lib/storage';

export async function GET() {
  try {
    const config = fileStorage.getTelegramConfig();
    return NextResponse.json({
      configured: !!config.botToken,
      botToken: config.botToken || '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, token, chatId } = body;

    if (action === 'save_token' && token) {
      fileStorage.saveTelegramConfig(token);
      return NextResponse.json({ success: true, message: 'Token salvo com sucesso!' });
    }

    if (action === 'test_bot') {
      const res = await defaultTelegramService.testBot(token);
      if (res.success && token) {
        fileStorage.saveTelegramConfig(token);
      }
      return NextResponse.json(res);
    }

    if (action === 'test_message' && chatId) {
      if (token) {
        fileStorage.saveTelegramConfig(token);
      }
      const res = await defaultTelegramService.sendTestMessage(chatId, token);
      await db.addLog({
        modulo: 'telegram',
        evento: 'Teste de Envio',
        status: res.success ? 'sucesso' : 'alerta',
        mensagem: `Disparo de teste para o chat ${chatId}: ${res.message}`,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

