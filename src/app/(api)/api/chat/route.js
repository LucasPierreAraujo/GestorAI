import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';
import prisma from '../../../../lib/prisma';
import 'dotenv/config';

const apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : undefined;

if (!apiKey) {
  throw new Error("A chave de API da Groq não foi encontrada. Verifique seu arquivo .env.");
}

const groq = new Groq({ apiKey: apiKey });

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
  const verificacao = verificarToken(request);
  if (verificacao.status !== 200) {
    return NextResponse.json({ error: verificacao.error }, { status: verificacao.status });
  }

  const { id: userId } = verificacao.usuario;
  const { message } = await request.json();

  try {
    const relevantTasks = await prisma.task.findMany({
      where: {
        userId,
        title: {
          contains: message,
         
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
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: fullPrompt
        },
        {
          role: "user",
          content: message,
        }
      ],
      model: "openai/gpt-oss-20b", // Mantendo o modelo que você pediu
    });

    const responseContent = chatCompletion.choices[0].message.content;
    
    return NextResponse.json({ response: responseContent }, { status: 200 });
  } catch (error) {
    console.error('Erro na integração com o Groq:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}