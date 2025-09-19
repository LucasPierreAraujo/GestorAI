import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk'; // <- CORRETO
import prisma from '../../../../lib/prisma';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error('❌ ERRO: GROQ_API_KEY não encontrada. Verifique seu .env na raiz do projeto.');
}

const groq = apiKey ? new Groq({ apiKey: apiKey.trim() }) : null;

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

export async function POST(request) {
  // 🔐 Verificação do token
  const verificacao = verificarToken(request);
  if (verificacao.status !== 200) {
    return NextResponse.json({ error: verificacao.error }, { status: verificacao.status });
  }

  // 🔑 Garante que a chave existe antes de tentar usar o Groq
  if (!groq) {
    return NextResponse.json(
      { error: 'Configuração inválida: GROQ_API_KEY não está definida no servidor.' },
      { status: 500 }
    );
  }

  const { id: userId } = verificacao.usuario;
  const { message } = await request.json();

  try {
    // 🔍 Busca tarefas relevantes
    const relevantTasks = await prisma.task.findMany({
  where: {
    userId,
    title: {
      contains: message, // Já é case-insensitive no SQLite
    }
  },
  take: 5,
    });

    let promptContext = relevantTasks.map(task => 
      `Pergunta Frequente: ${task.title}`
    ).join('\n');

    const fullPrompt = `Você é um assistente virtual para organização de rotinas.
    Considere as seguintes tarefas do usuário para responder, se for relevante:
    ${promptContext}
    
    Pergunta do usuário: ${message}`;

    // 💬 Chamada para o Groq
    const chatCompletion = await groq.chat.completions.create({
  messages: [
    { role: "system", content: fullPrompt },
    { role: "user", content: message },
  ],
  model: "openai/gpt-oss-20b"

    });

    const responseContent = chatCompletion.choices[0].message.content;
    return NextResponse.json({ response: responseContent }, { status: 200 });

  } catch (error) {
    console.error('Erro na integração com o Groq:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
