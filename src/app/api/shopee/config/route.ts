import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const config = await db.getShopeeConfig();
    return NextResponse.json({
      appId: config.appId || '',
      hasSecretKey: Boolean(config.secretKey && config.secretKey.length > 5),
      hasAccessToken: Boolean(config.accessToken && config.accessToken.length > 5),
      status: config.status || (config.appId ? 'ativo' : 'inativo'),
      mensagemStatus: config.mensagemStatus || '',
      ultimoTesteEm: config.ultimoTesteEm || '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appId, secretKey, accessToken } = body;

    const current = await db.getShopeeConfig();

    // Se o usuário não redigitou a secretKey, preserva a atual
    const newSecretKey =
      secretKey && !secretKey.includes('•••') && secretKey.trim().length > 0
        ? secretKey.trim()
        : current.secretKey;

    const newAccessToken =
      accessToken && !accessToken.includes('•••')
        ? accessToken.trim()
        : current.accessToken;

    const cleanAppId = (appId || current.appId || '').trim();

    const updated = await db.saveShopeeConfig({
      appId: cleanAppId,
      secretKey: newSecretKey,
      accessToken: newAccessToken,
      status: cleanAppId && newSecretKey ? 'ativo' : 'inativo',
      mensagemStatus: cleanAppId && newSecretKey ? 'Credenciais salvas e ativas' : 'Aguardando credenciais completas',
      ultimoTesteEm: new Date().toISOString(),
    });

    await db.addLog({
      modulo: 'shopee',
      evento: 'Credenciais Atualizadas',
      status: 'sucesso',
      mensagem: `App ID "${cleanAppId}" configurado no sistema.`,
    });

    return NextResponse.json({
      success: true,
      config: {
        appId: updated.appId,
        hasSecretKey: Boolean(updated.secretKey),
        status: updated.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
