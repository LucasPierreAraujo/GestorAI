// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; 

// Rotas que não precisam de autenticação (públicas)
const rotasPublicas = ['/', '/cadastro', '/login'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  console.log(`Middleware ativado para a rota: ${pathname}`);

  // 1. Se o usuário já estiver logado e tentar acessar rota pública, redireciona para dashboard
  if (token && rotasPublicas.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Se usuário não estiver logado e tentar acessar rota privada, redireciona para login
  if (!token && !rotasPublicas.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Se houver token, verificar validade
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      return NextResponse.next();
    } catch (err) {
      console.log('Token inválido ou expirado:', err);
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // 4. Se rota pública sem token, apenas deixa passar
  return NextResponse.next();
}

// Matcher que ignora arquivos estáticos e API
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|vercel.svg|window.svg).*)'],
};
