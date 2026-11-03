import { NextResponse } from 'next/server';
import { backgroundWorker } from '@/services/scheduler/BackgroundWorker';
import { db } from '@/lib/db';

export async function GET() {
  const status = backgroundWorker.getStatus();
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, intervalMinutes } = body;

    if (action === 'start') {
      await db.saveAutomationSettings({ ativo: true });
      backgroundWorker.start(intervalMinutes || 15);
      return NextResponse.json({ success: true, message: 'Automação ativada.', status: backgroundWorker.getStatus() });
    }

    if (action === 'stop') {
      await db.saveAutomationSettings({ ativo: false });
      backgroundWorker.stop();
      return NextResponse.json({ success: true, message: 'Automação pausada.', status: backgroundWorker.getStatus() });
    }

    if (action === 'trigger_now') {
      const res = await backgroundWorker.triggerNow('Disparo Manual pelo Painel', true);
      return NextResponse.json({ ...res, status: backgroundWorker.getStatus() });
    }

    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
