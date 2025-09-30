// app/api/chat/route.js
import prisma from '@/lib/prisma';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY?.trim(),
});

// Função para verificar JWT
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

// Rota GET para evitar erro 405
export async function GET() {
  return NextResponse.json(
    { message: 'Rota de chat aceita apenas requisições POST.' }, 
    { status: 405 }
  );
}

// Rota POST
export async function POST(req) {
  // Verifica JWT
  const verificacao = verificarToken(req);
  if (verificacao.status !== 200) {
    return NextResponse.json({ error: verificacao.error }, { status: verificacao.status });
  }

  const { id: userId } = verificacao.usuario;

  // Lê body
  let conversationId, userMessage;
  try {
    const body = await req.json();
    console.log("DEBUG body recebido:", body);

    // Aceita ambos campos: message ou userMessage
    conversationId = body.conversationId;
    userMessage = body.userMessage || body.message;
  } catch (error) {
    return NextResponse.json(
      { message: 'Erro 400: O corpo da requisição não é um JSON válido.' },
      { status: 400 }
    );
  }

  // Validação
  if (!conversationId || !userMessage) {
    return NextResponse.json(
      { message: 'Erro 400: Faltando conversationId ou userMessage/message.' },
      { status: 400 }
    );
  }

  try {
    // Salva mensagem do usuário
    await prisma.chatMessage.create({
      data: {
        conversationId,
        text: userMessage,
        sender: 'user',
      },
    });

    // Busca histórico completo da conversa
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Formata mensagens para Groq
    const chatMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    // Adiciona instrução do sistema
    chatMessages.unshift({
      role: 'system',
      content: 'Você é um assistente virtual que ajuda a organizar tarefas e responder dúvidas.',
    });

    // Chamada Groq
    const chatCompletion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: chatMessages,
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 'Não consegui gerar uma resposta.';

    // Salva resposta do assistente
    await prisma.chatMessage.create({
      data: {
        conversationId,
        text: assistantResponse,
        sender: 'assistant',
      },
    });

    return NextResponse.json({ response: assistantResponse }, { status: 200 });

  } catch (error) {
    console.error('Erro na rota de chat:', error);
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
  }
}
