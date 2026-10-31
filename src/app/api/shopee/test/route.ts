import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMarketplaceProvider } from '@/services/marketplace';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let appId = body.appId?.trim();
    let secretKey = body.secretKey?.trim();

    const currentConfig = await db.getShopeeConfig();

    if (!appId) appId = currentConfig.appId;
    if (!secretKey || secretKey.includes('•••')) secretKey = currentConfig.secretKey;

    if (!appId || !secretKey) {
      return NextResponse.json({
        success: false,
        message: 'Por favor, preencha o App ID e a Secret Key antes de testar a conexão.',
      });
    }

    const provider = getMarketplaceProvider('shopee', { appId, secretKey });
    const result = await provider.testConnection();

    await db.saveShopeeConfig({
      appId,
      secretKey,
      status: result.success ? 'ativo' : 'invalido',
      mensagemStatus: result.message,
      ultimoTesteEm: new Date().toISOString(),
    });

    await db.addLog({
      modulo: 'shopee',
      evento: 'Teste de Conexão Oficial',
      status: result.success ? 'sucesso' : 'alerta',
      mensagem: result.message,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
