import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout realizado com sucesso.',
  });

  response.cookies.set({
    name: AUTH_CONFIG.cookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

