import prisma from '@/lib/prisma';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Inicializa o cliente Groq.
const groq = new Groq();

// --- Função auxiliar para validar JWT ---
function verifyToken(req) {
  const authHeader = req.headers.get('authorization'); // Pega o header Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1]; // Remove o "Bearer "
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT_SECRET precisa estar no .env
    return decoded;
  } catch (err) {
    return null;
  }
}

// GET para tratar erros no navegador
export async function GET() {
  return NextResponse.json(
    { message: 'Rota de chat aceita apenas requisições POST.' },
    { status: 405 }
  );
}

// POST principal
export async function POST(req) {
  // --- AUTORIZAÇÃO ---
  const user = verifyToken(req);
  if (!user) {
    return NextResponse.json(
      { message: 'Não autorizado. Token inválido ou ausente.' },
      { status: 401 }
    );
  }

  let conversationId, userMessage;
  try {
    const body = await req.json();
    conversationId = body.conversationId;
    userMessage = body.userMessage;
  } catch (error) {
    return NextResponse.json(
      { message: 'Erro 400: O corpo da requisição não é um JSON válido.' },
      { status: 400 }
    );
  }

  if (!conversationId || conversationId.trim() === '' || !userMessage || userMessage.trim() === '') {
    return NextResponse.json(
      { message: 'Erro 400: Faltando ou valor vazio para conversationId ou userMessage.' },
      { status: 400 }
    );
  }

  try {
    // 1. Salva mensagem do usuário
    await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        text: userMessage,
        sender: 'user',
      },
    });

    // 2. Busca histórico
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Formata para Groq
    const chatMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    chatMessages.unshift({
      role: 'system',
      content: 'Você é um assistente virtual inteligente que ajuda a organizar tarefas e responder dúvidas.',
    });

    // 4. Envia para Groq
    const chatCompletion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: chatMessages,
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

    // 5. Salva resposta da IA
    await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        text: assistantResponse,
        sender: 'assistant',
      },
    });

    // 6. Retorna resposta
    return NextResponse.json(
      { response: assistantResponse },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro na rota de chat:', error);
    return NextResponse.json(
      { message: 'Ocorreu um erro interno no servidor.' },
      { status: 500 }
    );
  }
}
