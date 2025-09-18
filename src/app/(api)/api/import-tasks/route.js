// app/api/import-tasks/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';
import { stringify } from 'csv-stringify';

// Middleware para verificar a autenticação
function verificarToken(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return { error: 'Token não fornecido.', status: 401 };
  try {
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    return { usuario, status: 200 };
  } catch (error) {
    return { error: 'Token inválido.', status: 401 };
  }
}

// Rota de Importar (baixa do banco para o computador)
export async function GET(request) {
  const verificacao = verificarToken(request);
  if (verificacao.status !== 200) {
    return NextResponse.json({ error: verificacao.error }, { status: verificacao.status });
  }

  const { id: userId } = verificacao.usuario;

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        createdAt: true,
      },
    });

    const columns = {
      id: 'ID',
      title: 'Título da Tarefa',
      isCompleted: 'Concluída',
      createdAt: 'Data de Criação',
    };

    const csvData = await new Promise((resolve, reject) => {
      stringify(tasks, { header: true, columns }, (err, output) => {
        if (err) reject(err);
        resolve(output);
      });
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="tarefas_importadas.csv"',
      },
    });

  } catch (error) {
    console.error('Erro ao importar tarefas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}