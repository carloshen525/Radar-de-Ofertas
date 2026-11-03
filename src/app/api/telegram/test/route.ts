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

    if (action === 'test_all') {
      if (token) {
        fileStorage.saveTelegramConfig(token);
      }
      const canais = await db.getChannels();
      const canaisAtivos = canais.filter((c) => c.ativo && c.tipo !== 'admin');
      if (canaisAtivos.length === 0) {
        return NextResponse.json({ success: false, message: 'Nenhum canal ativo cadastrado.' });
      }

      const promises = canaisAtivos.map(async (c) => {
        const res = await defaultTelegramService.sendTestMessage(c.chat_id, token);
        return { chat: c.chat_id, nome: c.nome, ...res };
      });

      const results = await Promise.all(promises);
      const enviados = results.filter((r) => r.success).length;

      await db.addLog({
        modulo: 'telegram',
        evento: 'Teste Simultâneo em Massa',
        status: enviados === results.length ? 'sucesso' : 'alerta',
        mensagem: `Disparo simultâneo: ${enviados} de ${results.length} receberam a mensagem de teste.`,
        detalhes: results,
      });

      return NextResponse.json({
        success: enviados > 0,
        message: `Disparo simultâneo finalizado: ${enviados} de ${results.length} destinos receberam a mensagem!`,
        detalhes: results,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

