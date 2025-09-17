import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const rotasPrivadas = ['/dashboard', '/perfil', '/outra-rota-privada'];

export function middleware(req) {
  const url = req.nextUrl.clone();
  console.log(`middleware`,url)
  const token = req.cookies.get('token')?.value;

  // Se não for rota privada, deixa passar
  if (!rotasPrivadas.includes(url.pathname)) return NextResponse.next();

  // Se não tiver token, redireciona para login
  if (!token) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  try {
    // Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.next();
  } catch (err) {
    // Token inválido ou expirado
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}

// Aplica middleware nas rotas privadas
export const config = {
  matcher: ['/dashboard/:path*', '/perfil/:path*', '/outra-rota-privada/:path*'],
};
