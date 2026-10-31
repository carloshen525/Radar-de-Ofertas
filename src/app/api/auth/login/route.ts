import { NextResponse } from 'next/server';
import { validateCredentials, createSessionToken, AUTH_CONFIG } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const isValid = validateCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(email.toLowerCase().trim());

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso.',
      user: { email: email.toLowerCase().trim() },
    });

    response.cookies.set({
      name: AUTH_CONFIG.cookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_CONFIG.sessionDays * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}

