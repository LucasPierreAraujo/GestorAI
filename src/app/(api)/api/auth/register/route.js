// app/auth/api/register/route.js

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '../../../../../lib/prisma'; // Importe a instância do Prisma Client

export async function POST(request) {
  const { nomeCompleto, email, senha, repitaSenha } = await request.json();

  if (senha !== repitaSenha) {
    return NextResponse.json({ error: 'As senhas não coincidem.' }, { status: 400 });
  }

  // Verifica se o email já existe
  const usuarioExistente = await prisma.user.findUnique({ where: { email } });
  if (usuarioExistente) {
    return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 });
  }

  const salt = await bcrypt.genSalt(10);
  const senhaCriptografada = await bcrypt.hash(senha, salt);

  try {
    const novoUsuario = await prisma.user.create({
      data: {
        nomeCompleto,
        email,
        senha: senhaCriptografada,
      },
    });

    return NextResponse.json({ message: 'Usuário cadastrado com sucesso!', user: novoUsuario }, { status: 201 });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}