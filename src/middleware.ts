import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, AUTH_CONFIG } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Recursos estáticos e internos do Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Webhook oficial da automação N8N (nunca deve ser bloqueado por cookie de sessão)
  if (pathname === '/api/postar-oferta') {
    return NextResponse.next();
  }

  // 3. Rotas de autenticação
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 4. Verificação do token de sessão
  const sessionCookie = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  const { valid } = await verifySessionToken(sessionCookie);

  // Se o usuário já está autenticado e tenta acessar /login, redireciona para a home
  if (pathname === '/login') {
    if (valid) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Se NÃO está autenticado e tenta acessar qualquer outra rota protegida
  if (!valid) {
    // Para chamadas de API, retorna 401 Não Autorizado
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Acesso não autorizado. Faça login.' }, { status: 401 });
    }

    // Para páginas, redireciona para a tela de login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

