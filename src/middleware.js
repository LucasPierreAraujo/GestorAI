// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; 

// Adicione aqui apenas as rotas que não precisam de autenticação, exceto /login
const rotasPublicas = ['/cadastro', '/'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  console.log(`Middleware ativado para a rota: ${pathname}`);

  // Permite que a página de login seja acessada sem checagem
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 1. Redirecionar usuário logado de rotas públicas
  if (token && rotasPublicas.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Proteger rotas privadas
  if (!token && !rotasPublicas.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // 3. Verifica a validade do token para continuar
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch (err) {
    // Token inválido ou expirado, redireciona para login
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

// O matcher agora roda em todas as rotas
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|vercel.svg|window.svg).*)'],
};